import logging
import joblib
from pathlib import Path

import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Resolve MODEL_DIR relative to an environment variable so the file can be
# moved without breaking; fall back to a path relative to this file.
_DEFAULT_MODEL_DIR = Path(__file__).resolve().parent / "saved_models"
MODEL_DIR = Path(__import__("os").environ.get("MODEL_DIR", _DEFAULT_MODEL_DIR))


def _load_models(model_dir: Path):
    """Load the Random Forest model and label encoder from disk."""
    rf      = joblib.load(model_dir / "random_forest.pkl")
    encoder = joblib.load(model_dir / "label_encoder.pkl")
    return rf, encoder


# Module-level cache — models are loaded once and reused across calls.
_rf, _encoder = _load_models(MODEL_DIR)


def predict_disease(
    symptom_data: pd.DataFrame,
    model_dir: Path = MODEL_DIR,
) -> list[dict]:
    """
    Predict the most likely gastrointestinal disease for each row in
    *symptom_data* and return a confidence score alongside the label.

    Parameters
    ----------
    symptom_data : pd.DataFrame
        One or more rows of symptom features.  Column names must match
        those seen during training (available via ``rf.feature_names_in_``).
    model_dir : Path
        Directory containing the saved model artefacts.  Defaults to the
        module-level MODEL_DIR.

    Returns
    -------
    list[dict]
        Each dict has keys ``"disease"`` (str) and ``"confidence"`` (float
        in [0, 1]).

    Raises
    ------
    ValueError
        If *symptom_data* is missing expected feature columns.
    """
    rf, encoder = _load_models(model_dir) if model_dir != MODEL_DIR else (_rf, _encoder)

    # --- Input validation ---------------------------------------------------
    expected_cols: np.ndarray = rf.feature_names_in_
    missing = set(expected_cols) - set(symptom_data.columns)
    if missing:
        raise ValueError(
            f"symptom_data is missing {len(missing)} expected feature(s): {sorted(missing)}"
        )

    extra = set(symptom_data.columns) - set(expected_cols)
    if extra:
        logger.warning("Ignoring %d unexpected column(s): %s", len(extra), sorted(extra))

    # Enforce column order and drop unexpected columns
    symptom_data = symptom_data[expected_cols]

    # --- Inference ----------------------------------------------------------
    predictions  = rf.predict(symptom_data)
    probabilities = rf.predict_proba(symptom_data)  # shape (n_rows, n_classes)

    results = []
    for pred, proba in zip(predictions, probabilities):
        disease    = encoder.inverse_transform([pred])[0]
        confidence = float(round(proba.max(), 4))
        results.append({"disease": disease, "confidence": confidence})
        logger.info("Predicted: %s (confidence: %.2f%%)", disease, confidence * 100)

    return results


if __name__ == "__main__":
    # Quick smoke-test with a zero-vector (replace with real feature values)
    rf, _ = _load_models(MODEL_DIR)
    dummy = pd.DataFrame(
        data=[[0] * len(rf.feature_names_in_)],
        columns=rf.feature_names_in_,
    )
    output = predict_disease(dummy)
    print(output)