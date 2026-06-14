import logging
import pandas as pd
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent

# The raw filtered dataset is in "long" format: a Disease column plus
# Symptom_1 .. Symptom_17 columns containing symptom NAMES (strings), with
# many empty cells. _to_binary_features() converts this into a wide
# one-hot matrix (disease + one 0/1 column per unique symptom).
DATASET_PATH = BASE_DIR / "dataset" / "dataset_filtered.csv"


def _to_binary_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Convert a long-format symptom dataset (Disease, Symptom_1..Symptom_N,
    with symptom names as strings and blank cells for unused slots) into a
    wide binary one-hot matrix: one 0/1 column per unique symptom, plus a
    'disease' label column.
    """
    symptom_cols = [c for c in df.columns if c.lower().startswith("symptom")]
    if not symptom_cols:
        raise ValueError(
            "No 'Symptom_*' columns found — is this dataset already in "
            "binary wide format? If so, skip _to_binary_features()."
        )

    # Clean whitespace (the source CSV has values like ' skin_rash')
    symptoms = df[symptom_cols].apply(lambda col: col.astype(str).str.strip())
    symptoms = symptoms.replace({"nan": ""})

    # Reshape to long form: one row per (original_row, symptom) pair
    symptoms["__row__"] = df.index
    long = symptoms.melt(id_vars="__row__", value_name="symptom")
    long = long[long["symptom"] != ""]

    # Pivot into a binary indicator matrix (rows = original rows, cols = symptoms)
    binary = pd.crosstab(long["__row__"], long["symptom"])
    binary = (binary > 0).astype(int)
    binary = binary.reindex(df.index, fill_value=0)

    # Attach the disease label (handle either 'Disease' or 'disease')
    disease_col = "Disease" if "Disease" in df.columns else "disease"
    binary["disease"] = df[disease_col].astype(str).str.strip()

    return binary


def load_raw_data(path: Path = DATASET_PATH) -> pd.DataFrame:
    """Load the dataset and convert/clean it into a binary feature matrix."""
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found at: {path}")

    if path.suffix.lower() == ".csv":
        df = pd.read_csv(path)
    else:
        df = pd.read_excel(path)

    logger.info("Loaded raw dataset with shape: %s", df.shape)
    logger.info("Columns: %s", df.columns.tolist())

    # Convert long-format symptom columns into a binary matrix, unless the
    # dataset is already in binary wide format (no Symptom_* columns).
    if any(c.lower().startswith("symptom") for c in df.columns):
        df = _to_binary_features(df)
        logger.info("Converted to binary feature matrix with shape: %s", df.shape)

    # Drop exact duplicate rows
    before = len(df)
    df = df.drop_duplicates()
    logger.info("Dropped %d duplicate rows.", before - len(df))

    # Handle missing values
    missing = df.isnull().sum().sum()
    if missing > 0:
        logger.warning("Found %d missing values — dropping affected rows.", missing)
        df = df.dropna()

    # Remove all-zero feature columns (noisy / uninformative features)
    feature_cols = [c for c in df.columns if c != "disease"]
    all_zero_cols = [c for c in feature_cols if (df[c] == 0).all()]
    if all_zero_cols:
        logger.info("Dropping all-zero columns: %s", all_zero_cols)
        df = df.drop(columns=all_zero_cols)

    logger.info("Disease distribution:\n%s", df["disease"].value_counts())
    logger.info(
        "Unique symptom patterns: %d",
        len(df.drop("disease", axis=1).drop_duplicates()),
    )

    # Warn if any class is small enough that test-set metrics may be noisy
    min_class_count = df["disease"].value_counts().min()
    if min_class_count < 10:
        logger.warning(
            "Smallest class has only %d sample(s). Test-set metrics for "
            "that class may be unreliable.", min_class_count
        )

    return df


def preprocess(df: pd.DataFrame):
    """
    Encode labels, split into train/test sets, and scale features.

    Returns a dict with all splits, the fitted encoder, scaler, and feature names.
    KNN and SVM should use the scaled splits; Random Forest uses the unscaled splits.
    """
    # 'Category' is dropped defensively in case an older-format dataset is used.
    cols_to_drop = [c for c in ["Category", "disease"] if c in df.columns]
    X = df.drop(columns=cols_to_drop)
    y = df["disease"]

    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y_encoded,
        test_size=0.20,
        random_state=42,
        stratify=y_encoded,
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    return {
        "X": X,
        "y": y_encoded,
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "X_train_scaled": X_train_scaled,
        "X_test_scaled": X_test_scaled,
        "encoder": encoder,
        "scaler": scaler,
        "feature_names": list(X.columns),
    }


def load_data(path: Path = DATASET_PATH) -> dict:
    """Convenience wrapper: load raw data then preprocess it."""
    df = load_raw_data(path)
    return preprocess(df)


if __name__ == "__main__":
    data = load_data()
    logger.info("Dataset loaded successfully.")
    logger.info("Feature matrix shape: %s", data["X"].shape)
    logger.info("Number of classes: %d", len(set(data["y"])))
    logger.info("Features: %s", data["feature_names"])