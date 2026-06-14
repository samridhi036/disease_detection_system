# evaluate_models.py

import logging
import joblib
from pathlib import Path
from preprocessing import load_data
import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt

from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR  = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "saved_models"
REPORT_DIR = BASE_DIR / "reports"


def evaluate(model_dir: Path = MODEL_DIR, report_dir: Path = REPORT_DIR) -> None:
    report_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Load data & models
    # ------------------------------------------------------------------
    data = load_data()
    logger.info("Dataset shape : %s", data["X"].shape)
    logger.info("Num. classes  : %d", len(set(data["y"])))

    X_test        = data["X_test"]
    X_test_scaled = data["X_test_scaled"]   # kept for reference; not used directly
    y_test        = data["y_test"]
    encoder       = data["encoder"]
    disease_labels = encoder.classes_       # human-readable class names

    # All three models now accept raw (unscaled) features:
    # KNN and SVM are Pipelines that include their own scaler.
    knn = joblib.load(model_dir / "knn.pkl")
    svm = joblib.load(model_dir / "svm.pkl")
    rf  = joblib.load(model_dir / "random_forest.pkl")

    models = {
        "KNN":           (knn, X_test),
        "SVM":           (svm, X_test),
        "Random Forest": (rf,  X_test),
    }

    # ------------------------------------------------------------------
    # Cross-validation on full dataset (5-fold, stratified)
    # ------------------------------------------------------------------
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    print("\n" + "=" * 60)
    print("CROSS-VALIDATION (5-fold, stratified)")
    print("=" * 60)

    for name, (model, _) in models.items():
        cv_scores = cross_val_score(model, data["X"], data["y"], cv=cv, scoring="accuracy")
        logger.info(
            "%s CV Accuracy: %.4f ± %.4f",
            name, cv_scores.mean(), cv_scores.std()
        )
        print(f"{name:>15}  {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # ------------------------------------------------------------------
    # Hold-out test set evaluation
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("HOLD-OUT TEST SET EVALUATION")
    print("=" * 60)

    results = []

    for name, (model, X_eval) in models.items():
        preds = model.predict(X_eval)

        accuracy  = accuracy_score(y_test, preds)
        precision = precision_score(y_test, preds, average="weighted", zero_division=0)
        recall    = recall_score(y_test, preds, average="weighted", zero_division=0)
        f1        = f1_score(y_test, preds, average="weighted", zero_division=0)

        results.append({
            "Model":     name,
            "Accuracy":  accuracy,
            "Precision": precision,
            "Recall":    recall,
            "F1 Score":  f1,
        })

        print(f"\n{'=' * 60}")
        print(f"  {name}")
        print(f"  Accuracy  : {accuracy:.4f}")
        print(f"  Precision : {precision:.4f}")
        print(f"  Recall    : {recall:.4f}")
        print(f"  F1 Score  : {f1:.4f}")
        print(f"\n  Classification Report")
        print(classification_report(y_test, preds, target_names=disease_labels, zero_division=0))

        # Confusion matrix with disease-name labels
        cm = confusion_matrix(y_test, preds)
        fig, ax = plt.subplots(figsize=(max(8, len(disease_labels)), max(6, len(disease_labels) - 2)))
        sns.heatmap(
            cm,
            annot=True,
            fmt="d",
            cmap="Blues",
            xticklabels=disease_labels,
            yticklabels=disease_labels,
            ax=ax,
        )
        ax.set_title(f"{name} — Confusion Matrix")
        ax.set_xlabel("Predicted")
        ax.set_ylabel("Actual")
        plt.xticks(rotation=45, ha="right")
        plt.tight_layout()

        fig_path = report_dir / f"confusion_matrix_{name.lower().replace(' ', '_')}.png"
        fig.savefig(fig_path, dpi=150)
        plt.close(fig)
        logger.info("Saved confusion matrix → %s", fig_path)

    # ------------------------------------------------------------------
    # Summary table — printed and saved to CSV
    # ------------------------------------------------------------------
    results_df = pd.DataFrame(results).set_index("Model")

    print("\n" + "=" * 60)
    print("MODEL COMPARISON")
    print("=" * 60)
    print(results_df.to_string(float_format="{:.4f}".format))

    csv_path = report_dir / "model_comparison.csv"
    results_df.to_csv(csv_path)
    logger.info("Saved comparison table → %s", csv_path)

    # Prediction agreement between models
    preds_all = {name: model.predict(X_eval) for name, (model, X_eval) in models.items()}
    names = list(preds_all.keys())
    print("\n" + "=" * 60)
    print("PREDICTION AGREEMENT")
    print("=" * 60)
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            a, b = names[i], names[j]
            agree = (preds_all[a] == preds_all[b]).mean()
            print(f"  {a} vs {b}: {agree:.2%} agreement")


if __name__ == "__main__":
    evaluate()