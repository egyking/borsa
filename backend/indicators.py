import pandas as pd
import numpy as np

# Minimum rows needed before indicators (mainly sma_200) become valid.
MIN_ROWS = 210


def calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
    data = df.copy()
    close = data["close"]
    high = data["high"]
    low = data["low"]
    volume = data["volume"]

    # RSI
    delta = close.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta.where(delta < 0, 0.0))
    avg_gain = gain.rolling(14).mean()
    avg_loss = loss.rolling(14).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    data["rsi"] = 100 - (100 / (1 + rs))

    # MACD
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    data["macd"] = ema12 - ema26
    data["macd_signal"] = data["macd"].ewm(span=9, adjust=False).mean()
    data["macd_hist"] = data["macd"] - data["macd_signal"]

    # Moving Averages
    data["sma_20"] = close.rolling(20).mean()
    data["sma_50"] = close.rolling(50).mean()
    data["sma_200"] = close.rolling(200).mean()
    data["ema_12"] = ema12
    data["ema_26"] = ema26

    # Bollinger Bands
    bb_mid = close.rolling(20).mean()
    bb_std = close.rolling(20).std()
    data["bb_upper"] = bb_mid + 2 * bb_std
    data["bb_lower"] = bb_mid - 2 * bb_std
    data["bb_width"] = (data["bb_upper"] - data["bb_lower"]) / bb_mid

    # Stochastic Oscillator
    low_14 = low.rolling(14).min()
    high_14 = high.rolling(14).max()
    data["stoch_k"] = 100 * ((close - low_14) / (high_14 - low_14).replace(0, np.nan))
    data["stoch_d"] = data["stoch_k"].rolling(3).mean()

    # Volume indicators
    data["volume_sma_20"] = volume.rolling(20).mean()
    data["volume_ratio"] = volume / data["volume_sma_20"].replace(0, np.nan)

    # OBV (simplified)
    obv = (volume * np.sign(close.diff())).fillna(0).cumsum()
    data["obv"] = obv
    data["obv_sma_20"] = obv.rolling(20).mean()

    # Price rate of change
    data["roc_10"] = close.pct_change(10) * 100

    # ATR (Average True Range)
    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low - close.shift()).abs(),
    ], axis=1).max(axis=1)
    data["atr"] = tr.rolling(14).mean()

    data.dropna(inplace=True)
    return data


FEATURE_COLUMNS = [
    "rsi", "macd", "macd_signal", "macd_hist",
    "sma_20", "sma_50", "sma_200",
    "ema_12", "ema_26",
    "bb_upper", "bb_lower", "bb_width",
    "stoch_k", "stoch_d",
    "volume_ratio", "obv", "obv_sma_20",
    "roc_10", "atr",
]


def get_feature_vector(df: pd.DataFrame) -> pd.DataFrame:
    return df[FEATURE_COLUMNS].copy()


# ---------------------------------------------------------------------------
# Human-readable analysis (Arabic) + rule-based recommendation / risk.
# These work without any ML model and are used for gold and as a fallback.
# ---------------------------------------------------------------------------

def rule_based_signals(data: pd.DataFrame) -> list[str]:
    """Return a short list of Arabic explanations for the latest bar."""
    r = data.iloc[-1]
    reasons: list[str] = []

    rsi = float(r.get("rsi", 50))
    if rsi < 30:
        reasons.append(f"مؤشر RSI عند {rsi:.0f} (تشبّع بيعي — فرصة شراء محتملة)")
    elif rsi > 70:
        reasons.append(f"مؤشر RSI عند {rsi:.0f} (تشبّع شرائي — حذر من التصحيح)")

    if r.get("macd_hist", 0) > 0:
        reasons.append("MACD إيجابي (زخم صاعد)")
    else:
        reasons.append("MACD سلبي (زخم هابط)")

    close = float(r["close"])
    sma50 = float(r.get("sma_50", close))
    sma200 = float(r.get("sma_200", close))
    if close > sma50 > sma200:
        reasons.append("السعر فوق المتوسطين 50 و200 (اتجاه صاعد قوي)")
    elif close < sma50 < sma200:
        reasons.append("السعر تحت المتوسطين 50 و200 (اتجاه هابط)")
    elif close > sma200:
        reasons.append("السعر فوق متوسط 200 يوم (اتجاه طويل إيجابي)")
    else:
        reasons.append("السعر تحت متوسط 200 يوم (اتجاه طويل ضعيف)")

    stoch = float(r.get("stoch_k", 50))
    if stoch < 20:
        reasons.append("ستوكاستيك في منطقة تشبّع بيعي")
    elif stoch > 80:
        reasons.append("ستوكاستيك في منطقة تشبّع شرائي")

    vr = float(r.get("volume_ratio", 1))
    if vr > 1.5:
        reasons.append(f"حجم تداول مرتفع ({vr:.1f}× المتوسط)")

    return reasons[:5]


def compute_risk(data: pd.DataFrame, signal: str, threshold_pct: float) -> dict:
    """Entry / stop-loss / take-profit + volatility level from ATR."""
    r = data.iloc[-1]
    close = float(r["close"])
    atr = float(r.get("atr", 0.0) or 0.0)
    atr_pct = (atr / close * 100) if close else 0.0
    level = "high" if atr_pct > 4 else ("medium" if atr_pct > 2 else "low")

    stop = target = None
    if signal == "buy":
        stop = close - 1.5 * atr
        target = close * (1 + threshold_pct / 100)
    elif signal == "sell":
        stop = close + 1.5 * atr
        target = close * (1 - threshold_pct / 100)

    return {
        "entry": round(close, 2),
        "stop_loss": round(stop, 2) if stop else None,
        "take_profit": round(target, 2) if target else None,
        "atr_pct": round(atr_pct, 2),
        "level": level,
    }


def rule_based_recommendation(data: pd.DataFrame, horizon: str = "short",
                              threshold_pct: float = 2.5) -> dict:
    """Pure technical-analysis recommendation (no ML). Used for gold / fallback."""
    if data.empty:
        return {"signal": "hold", "confidence": 0.0, "score": 0.0,
                "prob_buy": 0.0, "prob_hold": 1.0, "prob_sell": 0.0,
                "reasons": ["لا توجد بيانات كافية"], "risk": {}}

    r = data.iloc[-1]
    close = float(r["close"])
    score = 0.0

    rsi = float(r.get("rsi", 50))
    if rsi < 30:
        score += 2
    elif rsi < 45:
        score += 0.5
    elif rsi > 70:
        score -= 2
    elif rsi > 55:
        score -= 0.5

    score += 1 if r.get("macd_hist", 0) > 0 else -1
    score += 0.5 if r.get("macd", 0) > r.get("macd_signal", 0) else -0.5

    sma50 = float(r.get("sma_50", close))
    sma200 = float(r.get("sma_200", close))
    trend_w = 1.5 if horizon == "long" else 1.0
    score += trend_w if close > sma50 else -trend_w
    score += trend_w if sma50 > sma200 else -trend_w

    stoch = float(r.get("stoch_k", 50))
    if stoch < 20:
        score += 1
    elif stoch > 80:
        score -= 1

    score += 0.5 if float(r.get("roc_10", 0)) > 0 else -0.5

    max_score = 7.0
    norm = max(-1.0, min(1.0, score / max_score))
    th = 0.18
    if norm >= th:
        signal = "buy"
    elif norm <= -th:
        signal = "sell"
    else:
        signal = "hold"

    confidence = round(min(1.0, abs(norm) + 0.35), 3)
    prob_buy = round(max(0.0, norm) * 0.7 + (0.34 if signal == "buy" else 0.2), 3)
    prob_sell = round(max(0.0, -norm) * 0.7 + (0.34 if signal == "sell" else 0.2), 3)
    prob_hold = round(max(0.0, 1 - prob_buy - prob_sell), 3)

    return {
        "signal": signal,
        "confidence": confidence,
        "score": round(norm, 3),
        "prob_buy": prob_buy,
        "prob_hold": prob_hold,
        "prob_sell": prob_sell,
        "reasons": rule_based_signals(data),
        "risk": compute_risk(data, signal, threshold_pct),
    }
