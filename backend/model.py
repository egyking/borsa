import pickle
import os
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier

from config import DATA_DIR
from indicators import (
    calculate_indicators, FEATURE_COLUMNS, MIN_ROWS,
    rule_based_signals, compute_risk, rule_based_recommendation,
)

MODEL_SHORT_PATH = os.path.join(DATA_DIR, "model_short.pkl")
MODEL_LONG_PATH = os.path.join(DATA_DIR, "model_long.pkl")
SCALER_PATH = os.path.join(DATA_DIR, "scaler.pkl")
# Legacy single-model path (used as fallback for both horizons).
MODEL_PATH = os.path.join(DATA_DIR, "model.pkl")

SIGNAL_MAP = {0: "sell", 1: "hold", 2: "buy"}

# Distinct horizons: short = speculation, long = investment.
HORIZONS = {
    "short": {"days": 5, "threshold": 2.5},
    "long": {"days": 60, "threshold": 10.0},
}


def create_model():
    return RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_split=10,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )


def generate_labels(df: pd.DataFrame, future_days: int, threshold: float) -> pd.Series:
    future_close = df["close"].shift(-future_days)
    pct_change = (future_close - df["close"]) / df["close"] * 100
    labels = pd.Series(1, index=df.index)  # hold
    labels[pct_change > threshold] = 2  # buy
    labels[pct_change < -threshold] = 0  # sell
    return labels


def prepare_training_data(df: pd.DataFrame, horizon: str) -> tuple:
    h = HORIZONS[horizon]
    data = calculate_indicators(df)
    labels = generate_labels(data, h["days"], h["threshold"])
    data = data.iloc[:-h["days"]]
    labels = labels.iloc[:-h["days"]]
    return data[FEATURE_COLUMNS], labels


def prepare_training_data_aligned(df: pd.DataFrame) -> tuple:
    """Both horizons on ONE aligned feature frame. Drops the MAX horizon once
    so neither label set peeks past the end (fixes short/long misalignment)."""
    data = calculate_indicators(df)
    y_short = generate_labels(data, HORIZONS["short"]["days"], HORIZONS["short"]["threshold"])
    y_long = generate_labels(data, HORIZONS["long"]["days"], HORIZONS["long"]["threshold"])
    drop = max(h["days"] for h in HORIZONS.values())
    data = data.iloc[:-drop]
    return data[FEATURE_COLUMNS], y_short.iloc[:-drop], y_long.iloc[:-drop]


def train_models(X: pd.DataFrame, y_short: pd.Series, y_long: pd.Series) -> tuple:
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model_short = create_model()
    model_short.fit(X_scaled, y_short)
    model_long = create_model()
    model_long.fit(X_scaled, y_long)

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(MODEL_SHORT_PATH, "wb") as f:
        pickle.dump(model_short, f)
    with open(MODEL_LONG_PATH, "wb") as f:
        pickle.dump(model_long, f)
    with open(SCALER_PATH, "wb") as f:
        pickle.dump(scaler, f)
    return model_short, model_long, scaler


def _load(path):
    if not os.path.exists(path):
        return None
    try:
        with open(path, "rb") as f:
            return pickle.load(f)
    except Exception:
        return None


def load_models():
    """Return (model_short, model_long, scaler) with graceful fallbacks."""
    scaler = _load(SCALER_PATH)
    model_short = _load(MODEL_SHORT_PATH)
    model_long = _load(MODEL_LONG_PATH)
    legacy = _load(MODEL_PATH)
    if model_short is None:
        model_short = legacy
    if model_long is None:
        model_long = legacy or model_short
    return model_short, model_long, scaler


# Backwards-compatible single-model loader.
def load_model():
    s, _, scaler = load_models()
    return s, scaler


def _ml_predict(data: pd.DataFrame, model, scaler, threshold_pct: float) -> dict:
    """Run a trained classifier on the latest enriched row."""
    features = data[FEATURE_COLUMNS].iloc[-1:]
    X_scaled = scaler.transform(features)
    probs = model.predict_proba(X_scaled)[0]
    classes = list(model.classes_)
    prob_by_class = {int(c): float(probs[i]) for i, c in enumerate(classes)}
    prob_buy = prob_by_class.get(2, 0.0)
    prob_hold = prob_by_class.get(1, 0.0)
    prob_sell = prob_by_class.get(0, 0.0)

    pred = int(classes[int(np.argmax(probs))])
    signal = SIGNAL_MAP.get(pred, "hold")
    confidence = float(np.max(probs))
    score = float(prob_buy - prob_sell)
    return {
        "signal": signal,
        "confidence": round(confidence, 3),
        "score": round(score, 3),
        "prob_buy": round(prob_buy, 3),
        "prob_hold": round(prob_hold, 3),
        "prob_sell": round(prob_sell, 3),
        "reasons": rule_based_signals(data),
        "risk": compute_risk(data, signal, threshold_pct),
        "source": "ml",
    }


def predict_one(df: pd.DataFrame, model, scaler, horizon: str) -> dict:
    """Recommendation for a single horizon. Falls back to pure TA if no model."""
    h = HORIZONS[horizon]
    data = calculate_indicators(df)
    if data.empty:
        return {"signal": "hold", "confidence": 0.0, "score": 0.0,
                "prob_buy": 0.0, "prob_hold": 1.0, "prob_sell": 0.0,
                "reasons": ["لا توجد بيانات كافية لحساب المؤشرات"], "risk": {},
                "source": "none"}
    if model is None or scaler is None:
        return rule_based_recommendation(data, horizon, h["threshold"])
    try:
        return _ml_predict(data, model, scaler, h["threshold"])
    except Exception:
        return rule_based_recommendation(data, horizon, h["threshold"])


def predict_both_timeframes(df: pd.DataFrame, model_short, model_long, scaler) -> dict:
    """Both horizons computed from the SAME enriched history (>=~2y)."""
    return {
        "short_term": predict_one(df, model_short, scaler, "short"),
        "long_term": predict_one(df, model_long, scaler, "long"),
    }
