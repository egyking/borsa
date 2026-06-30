"""Time-series-safe backtesting + evaluation for the dual-horizon signal models.

Methodology (expanding-window walk-forward):
  - Labels look H bars ahead -> an EMBARGO of >= H bars sits between train and
    test so forward-return windows never leak across the split.
  - StandardScaler + model are refit on PAST data only, each fold.
  - Classification metrics are computed on pooled out-of-sample predictions.
  - A long/flat trading simulation (round-trip cost) compares the strategy to
    buy-and-hold per stock; headline numbers are aggregated across stocks.

Designed for the small EGX universe: pools across stocks and reports n_trades /
n_folds next to every number so low-sample (esp. 60-day) stats are discounted.
"""
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score,
    precision_recall_fscore_support, confusion_matrix,
)

from indicators import calculate_indicators, FEATURE_COLUMNS
from model import HORIZONS

LABELS = (0, 1, 2)  # sell, hold, buy
ROUND_TRIP_COST = 0.004  # 0.4% EGX retail round trip (commissions + spread)


def make_labels(enriched: pd.DataFrame, h_days: int, threshold_pct: float):
    """Forward-return classification labels. NaN for the last h_days bars."""
    fwd = enriched["close"].shift(-h_days) / enriched["close"] - 1.0
    up = threshold_pct / 100.0
    y = pd.Series(np.where(fwd >= up, 2, np.where(fwd <= -up, 0, 1)),
                  index=enriched.index, dtype="float")
    y[fwd.isna()] = np.nan
    return y, fwd


def _make_model():
    return RandomForestClassifier(
        n_estimators=150, max_depth=12, min_samples_leaf=5,
        class_weight="balanced_subsample", random_state=42, n_jobs=-1,
    )


def walk_forward(enriched: pd.DataFrame, h_days: int, threshold_pct: float,
                 min_train: int = 120, test_size: int = 40):
    """Expanding-window walk-forward. Returns contiguous OOS arrays."""
    embargo = h_days
    y, fwd = make_labels(enriched, h_days, threshold_pct)
    X = enriched[FEATURE_COLUMNS]
    valid = y.notna() & X.notna().all(axis=1)
    idx = np.where(valid.values)[0]
    span = len(idx)

    y_true, y_pred, closes, fwds, dates = [], [], [], [], []
    n_folds = 0
    start_test = min_train + embargo
    for test_start in range(start_test, span - 1, test_size):
        train_end = test_start - embargo
        test_end = min(test_start + test_size, span)
        if train_end < min_train or test_end <= test_start:
            continue
        tr = idx[:train_end]
        te = idx[test_start:test_end]
        if len(np.unique(y.iloc[tr])) < 2:
            continue  # need >=2 classes to fit

        scaler = StandardScaler().fit(X.iloc[tr])
        clf = _make_model().fit(scaler.transform(X.iloc[tr]), y.iloc[tr].astype(int))
        pred = clf.predict(scaler.transform(X.iloc[te])).astype(int)

        y_true.append(y.iloc[te].values.astype(int))
        y_pred.append(pred)
        closes.append(enriched["close"].values[te])
        fwds.append(fwd.iloc[te].values)
        dates.append(enriched.index[te])
        n_folds += 1

    if not n_folds:
        return None
    return {
        "y_true": np.concatenate(y_true),
        "y_pred": np.concatenate(y_pred),
        "close": np.concatenate(closes),
        "fwd": np.concatenate(fwds),
        "dates": np.concatenate([d.values for d in dates]),
        "n_folds": n_folds,
    }


def simulate(close: np.ndarray, y_pred: np.ndarray, h_days: int,
             cost: float = ROUND_TRIP_COST):
    """Long/flat sim: enter on buy(2), exit after h_days or on sell(0)."""
    n = len(close)
    trades, daily_ret, equity = [], [], [1.0]
    pos, entry_px, held = 0, None, 0
    for t in range(n - 1):
        if pos == 0 and y_pred[t] == 2:
            pos, entry_px, held = 1, close[t], 0
        step = (close[t + 1] / close[t] - 1.0) if pos == 1 else 0.0
        daily_ret.append(step)
        equity.append(equity[-1] * (1 + step))
        if pos == 1:
            held += 1
            if held >= h_days or y_pred[t + 1] == 0:
                gross = close[t + 1] / entry_px - 1.0
                trades.append((1 + gross) * (1 - cost) - 1.0)
                pos, entry_px, held = 0, None, 0
    # Force-close any position still open at the last bar (realise the trade).
    if pos == 1 and entry_px:
        gross = close[-1] / entry_px - 1.0
        trades.append((1 + gross) * (1 - cost) - 1.0)
    return np.array(trades), np.array(daily_ret), np.array(equity)


def perf_stats(close: np.ndarray, trades, daily_ret, equity, ann: int = 252):
    E = np.asarray(equity)
    peak = np.maximum.accumulate(E)
    mdd = float((E / peak - 1.0).min()) if len(E) else 0.0
    sharpe = float(daily_ret.mean() / daily_ret.std() * np.sqrt(ann)) \
        if len(daily_ret) and daily_ret.std() > 0 else 0.0
    bh = float(close[-1] / close[0] - 1.0) if len(close) > 1 else 0.0
    return {
        "cum_return": float(E[-1] - 1.0),
        "buy_hold_return": bh,
        "sharpe": round(sharpe, 3),
        "max_drawdown": round(mdd, 4),
        "win_rate": float((trades > 0).mean()) if len(trades) else 0.0,
        "avg_trade_ret": float(trades.mean()) if len(trades) else 0.0,
        "n_trades": int(len(trades)),
    }


def _classification(y_true, y_pred):
    p, r, f1, sup = precision_recall_fscore_support(
        y_true, y_pred, labels=LABELS, zero_division=0)
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 3),
        "balanced_accuracy": round(float(balanced_accuracy_score(y_true, y_pred)), 3),
        "macro_f1": round(float(f1.mean()), 3),
        "buy_precision": round(float(p[2]), 3),
        "sell_precision": round(float(p[0]), 3),
        "confusion": confusion_matrix(y_true, y_pred, labels=LABELS).tolist(),
    }


def evaluate_horizon(histories: dict, horizon: str) -> dict | None:
    """Pool walk-forward OOS results across stocks for one horizon."""
    h = HORIZONS[horizon]
    all_true, all_pred = [], []
    cum, bh, sharpe, mdd, wins, n_trades = [], [], [], [], [], 0
    n_stocks = n_folds = 0
    span_start, span_end, n_bars = None, None, 0

    for sym, df in histories.items():
        try:
            enriched = calculate_indicators(df)
            wf = walk_forward(enriched, h["days"], h["threshold"])
            if not wf:
                continue
            all_true.append(wf["y_true"])
            all_pred.append(wf["y_pred"])
            trades, daily, equity = simulate(wf["close"], wf["y_pred"], h["days"])
            ps = perf_stats(wf["close"], trades, daily, equity)
            cum.append(ps["cum_return"]); bh.append(ps["buy_hold_return"])
            sharpe.append(ps["sharpe"]); mdd.append(ps["max_drawdown"])
            wins.append((ps["win_rate"], ps["n_trades"]))
            n_trades += ps["n_trades"]
            n_stocks += 1
            n_folds += wf["n_folds"]
            n_bars += len(wf["y_true"])
            d = pd.to_datetime(wf["dates"], utc=True)
            lo, hi = d.min(), d.max()
            span_start = lo if span_start is None else min(span_start, lo)
            span_end = hi if span_end is None else max(span_end, hi)
        except Exception as e:
            print(f"    eval skip {sym} ({horizon}): {e}")

    if not n_stocks:
        return None

    y_true = np.concatenate(all_true)
    y_pred = np.concatenate(all_pred)
    tot = sum(w[1] for w in wins) or 1
    win_rate = sum(w[0] * w[1] for w in wins) / tot

    block = _classification(y_true, y_pred)
    block.update({
        "cum_return": round(float(np.mean(cum)), 4),
        "buy_hold_return": round(float(np.mean(bh)), 4),
        "excess_vs_bh": round(float(np.mean(cum) - np.mean(bh)), 4),
        "sharpe": round(float(np.mean(sharpe)), 3),
        "max_drawdown": round(float(np.mean(mdd)), 4),
        "win_rate": round(float(win_rate), 3),
        "n_trades": int(n_trades),
        "n_stocks": int(n_stocks),
        "n_folds": int(n_folds),
        "n_bars": int(n_bars),
    })
    block["_span"] = (str(span_start.date()) if span_start is not None else None,
                      str(span_end.date()) if span_end is not None else None)
    return block


def evaluate(histories: dict, max_stocks: int = 12) -> dict | None:
    """Full evaluation block for both horizons (pooled, OOS, leakage-safe)."""
    items = list(histories.items())
    used = dict(items[:max_stocks])
    if len(items) > max_stocks:
        print(f"  evaluation: using {max_stocks}/{len(items)} stocks (capped for runtime)")

    out = {}
    span = (None, None)
    for horizon, key in (("short", "short_5d"), ("long", "long_60d")):
        block = evaluate_horizon(used, horizon)
        if block:
            span = block.pop("_span", span)
            out[key] = block
    if not out:
        return None

    out["test_span"] = {"start": span[0], "end": span[1]}
    out["cost_per_trade"] = ROUND_TRIP_COST
    out["method"] = "walk-forward OOS, embargo>=horizon, scaler refit per fold"
    out["survivorship"] = "current_listings_only"
    return out
