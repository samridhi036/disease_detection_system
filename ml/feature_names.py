# import pandas as pd
# from pathlib import Path
#
# BASE_DIR = Path(__file__).resolve().parent.parent
#
# DATASET_PATH = BASE_DIR / "dataset" / "gastro_disease.xlsx"
#
# df = pd.read_excel(DATASET_PATH)
#
# FEATURES = [
#     col
#     for col in df.columns
#     if col != "prognosis"
# ]

"""
Single source of truth for the model's feature column names.

Reuses preprocessing.load_raw_data() so that FEATURES always matches
whatever preprocessing.py actually produces (including the long-to-wide
conversion for the Symptom_1..Symptom_N dataset format).
"""

from preprocessing import load_raw_data

_df = load_raw_data()

FEATURES = [col for col in _df.columns if col != "disease"]


if __name__ == "__main__":
    print(f"{len(FEATURES)} features:")
    print(FEATURES)