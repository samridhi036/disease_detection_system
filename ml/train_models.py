import logging
import joblib
from pathlib import Path

from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score

from preprocessing import load_data

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "ml" / "saved_models"


def train_and_save(model_dir: Path = MODEL_DIR) -> None:
    model_dir.mkdir(parents=True, exist_ok=True)

    data = load_data()

    X_train = data["X_train"]
    X_train_scaled = data["X_train_scaled"]
    y_train = data["y_train"]

    # -------------------------------------------------------------------------
    # KNN — wrapped in a Pipeline so the scaler travels with the model.
    # n_neighbors=5 is the standard starting point for this dataset size;
    # tune via cross-validation if accuracy is insufficient.
    # -------------------------------------------------------------------------
    knn_pipeline = Pipeline([
        ("scaler", data["scaler"]),
        ("knn", KNeighborsClassifier(n_neighbors=5)),
    ])
    knn_pipeline.fit(X_train, y_train)
    knn_train_acc = accuracy_score(y_train, knn_pipeline.predict(X_train))
    logger.info("KNN   training accuracy: %.4f", knn_train_acc)

    # -------------------------------------------------------------------------
    # SVM — RBF kernel handles non-linear symptom boundaries well.
    # Also wrapped in a Pipeline so raw features can be passed at inference.
    # -------------------------------------------------------------------------
    svm_pipeline = Pipeline([
        ("scaler", data["scaler"]),
        ("svm", SVC(kernel="rbf", probability=True)),
    ])
    svm_pipeline.fit(X_train, y_train)
    svm_train_acc = accuracy_score(y_train, svm_pipeline.predict(X_train))
    logger.info("SVM   training accuracy: %.4f", svm_train_acc)

    # -------------------------------------------------------------------------
    # Random Forest — tree-based model; does not require scaling.
    # 200 estimators balances variance reduction against training time.
    # -------------------------------------------------------------------------
    rf = RandomForestClassifier(n_estimators=200, random_state=42)
    rf.fit(X_train, y_train)
    rf_train_acc = accuracy_score(y_train, rf.predict(X_train))
    logger.info("RF    training accuracy: %.4f", rf_train_acc)

    # Save models (Pipelines include their own scalers)
    joblib.dump(knn_pipeline, model_dir / "knn.pkl")
    joblib.dump(svm_pipeline, model_dir / "svm.pkl")
    joblib.dump(rf,           model_dir / "random_forest.pkl")

    # Save encoder separately (needed by predict.py and evaluate_models.py)
    joblib.dump(data["encoder"], model_dir / "label_encoder.pkl")

    logger.info("All models saved to %s", model_dir)


if __name__ == "__main__":
    train_and_save()