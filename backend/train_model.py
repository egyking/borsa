"""Train the EGX recommendation models (short-term + long-term horizons).

Usage: python train_model.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pandas as pd
from data_fetcher import fetch_all_history
from config import EGX_SYMBOLS
from model import (prepare_training_data, train_models,
                   MODEL_SHORT_PATH, MODEL_LONG_PATH, SCALER_PATH)


def main():
    print("Fetching historical data for EGX stocks...")
    histories = fetch_all_history(EGX_SYMBOLS, period="5y")

    X_parts, ys_parts, yl_parts = [], [], []
    for symbol, df in histories.items():
        if df is None or df.empty or len(df) < 300:
            print(f"  Skipping {symbol}: insufficient data "
                  f"({0 if df is None else len(df)} rows)")
            continue
        try:
            Xs, ys = prepare_training_data(df, "short")
            Xl, yl = prepare_training_data(df, "long")
            # Align on the shorter horizon's index so X/y stay consistent.
            n = min(len(Xs), len(Xl))
            X_parts.append(Xs.iloc[:n])
            ys_parts.append(ys.iloc[:n])
            yl_parts.append(yl.iloc[:n])
            print(f"  {symbol}: {n} training samples")
        except Exception as e:
            print(f"  Error processing {symbol}: {e}")

    if not X_parts:
        print("No data available for training. Check your internet connection.")
        sys.exit(1)

    X = pd.concat(X_parts, ignore_index=True)
    y_short = pd.concat(ys_parts, ignore_index=True)
    y_long = pd.concat(yl_parts, ignore_index=True)

    print(f"\nTotal samples: {len(X)}")
    print(f"Short labels:\n{y_short.value_counts().sort_index()}")
    print(f"Long labels:\n{y_long.value_counts().sort_index()}")

    print("\nTraining models...")
    train_models(X, y_short, y_long)
    print(f"Saved: {MODEL_SHORT_PATH}\n       {MODEL_LONG_PATH}\n       {SCALER_PATH}")
    print("Training complete!")


if __name__ == "__main__":
    main()
