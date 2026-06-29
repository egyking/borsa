import pandas as pd
import numpy as np

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
