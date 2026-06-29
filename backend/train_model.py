"""
Training script for the EGX stock recommendation model.
Run this once to train the initial model on historical data.
Usage: python train_model.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from data_fetcher import fetch_all_history, EGX_SYMBOLS
from model import prepare_training_data, train_model, MODEL_PATH, SCALER_PATH
from indicators import FEATURE_COLUMNS
import pandas as pd

def main():
    print("Fetching historical data for EGX stocks...")
    histories = fetch_all_history(EGX_SYMBOLS, period="5y")

    all_X = []
    all_y = []

    for symbol, df in histories.items():
        if df.empty or len(df) < 250:
            print(f"  Skipping {symbol}: insufficient data ({len(df)} rows)")
            continue
        try:
            X, y = prepare_training_data(df, FEATURE_COLUMNS)
            if len(X) > 50:
                all_X.append(X)
                all_y.append(y)
                print(f"  {symbol}: {len(X)} training samples")
        except Exception as e:
            print(f"  Error processing {symbol}: {e}")

    if not all_X:
        print("No data available for training. Check your internet connection.")
        sys.exit(1)

    X_full = pd.concat(all_X, ignore_index=True)
    y_full = pd.concat(all_y, ignore_index=True)

    print(f"\nTotal training samples: {len(X_full)}")
    print(f"Features: {len(FEATURE_COLUMNS)}")
    print(f"Label distribution:\n{y_full.value_counts().sort_index()}")

    print("\nTraining model...")
    model, scaler = train_model(X_full, y_full)

    print(f"Model saved to: {MODEL_PATH}")
    print(f"Scaler saved to: {SCALER_PATH}")
    print("Training complete!")

if __name__ == "__main__":
    main()
