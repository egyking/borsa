import pickle
import os
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier

_BASE = os.path.dirname(os.path.abspath(__file__))
for _p in [os.path.join(_BASE, "..", "data"), os.path.join(_BASE, "data")]:
    _d = os.path.abspath(_p)
    if os.path.isdir(_d) or os.path.exists(os.path.dirname(_d)):
        _DATA_DIR = _d
        break
else:
    _DATA_DIR = os.path.join(_BASE, "..", "data")
MODEL_PATH = os.path.join(_DATA_DIR, "model.pkl")
SCALER_PATH = os.path.join(_DATA_DIR, "scaler.pkl")

SIGNAL_MAP = {0: "sell", 1: "hold", 2: "buy"}

def create_model():
    return RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=10,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )

def generate_labels(df: pd.DataFrame, future_days: int = 5) -> pd.Series:
    future_close = df["close"].shift(-future_days)
    pct_change = (future_close - df["close"]) / df["close"] * 100
    labels = pd.Series(1, index=df.index)  # hold
    labels[pct_change > 2.0] = 2  # buy
    labels[pct_change < -2.0] = 0  # sell
    return labels

def prepare_training_data(df: pd.DataFrame, feature_cols: list) -> tuple:
    from indicators import calculate_indicators, FEATURE_COLUMNS
    data = calculate_indicators(df)
    labels = generate_labels(data)
    data = data.iloc[:-5]
    labels = labels.iloc[:-5]
    X = data[FEATURE_COLUMNS]
    y = labels
    return X, y

def train_model(X: pd.DataFrame, y: pd.Series) -> tuple:
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = create_model()
    model.fit(X_scaled, y)
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    with open(SCALER_PATH, "wb") as f:
        pickle.dump(scaler, f)
    return model, scaler

def load_model():
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        return None, None
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    with open(SCALER_PATH, "rb") as f:
        scaler = pickle.load(f)
    return model, scaler

def predict(df: pd.DataFrame, model, scaler) -> dict:
    from indicators import calculate_indicators, FEATURE_COLUMNS
    data = calculate_indicators(df)
    if data.empty:
        return {"signal": "hold", "confidence": 0.0, "score": 0.5}
    features = data[FEATURE_COLUMNS].iloc[-1:]
    X_scaled = scaler.transform(features)
    probs = model.predict_proba(X_scaled)[0]
    pred = model.predict(X_scaled)[0]
    signal = SIGNAL_MAP.get(pred, "hold")
    confidence = float(np.max(probs))
    score = float(probs[2] - probs[0]) if len(probs) == 3 else 0.0
    return {
        "signal": signal,
        "confidence": round(confidence, 3),
        "score": round(score, 3),
        "prob_buy": round(float(probs[2]), 3) if len(probs) > 2 else 0.0,
        "prob_sell": round(float(probs[0]), 3) if len(probs) > 0 else 0.0,
        "prob_hold": round(float(probs[1]), 3) if len(probs) > 1 else 0.0,
    }

def predict_both_timeframes(df_short: pd.DataFrame, df_long: pd.DataFrame, model, scaler) -> dict:
    short = predict(df_short, model, scaler)
    long = predict(df_long, model, scaler)
    return {"short_term": short, "long_term": long}
