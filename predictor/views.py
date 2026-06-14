import joblib
import numpy as np
import json

from pathlib import Path
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Avg, Count

from .models import PredictionSession

# -----------------------------
# Paths
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "ml" / "saved_models"

# models
model = joblib.load(MODEL_DIR / "random_forest.pkl")
scaler = joblib.load(MODEL_DIR / "scaler.pkl")
encoder = joblib.load(MODEL_DIR / "label_encoder.pkl")

# Symptoms = model features (132 columns)
symptoms = list(model.feature_names_in_)

# optional
disease_info = {}

def format_symptom_label(symptom):
    return symptom.replace("_", " ").title()


def login(request):
    return render(request, 'login.html')


def logout(request):
    return render(request, 'login.html')


def register(request):
    return render(request, 'register.html')


def index(request):
    symptoms_list = [
        {
            "key": s,
            "label": format_symptom_label(s),
            "category": get_symptom_category(s)
        }
        for s in symptoms
    ]

    return render(request, "predictor/index.html", {
        "symptoms": symptoms_list,
        "total_symptoms": len(symptoms_list),
        "model_ready": True
    })

@csrf_exempt
def predict(request):
    if request.method != "POST":
        return JsonResponse(
            {"error": "Method not allowed"},
            status=405
        )

    try:
        data = json.loads(request.body)

        selected_symptoms = data.get("symptoms", [])
        patient_name = (data.get("patient_name") or "").strip()[:150]
        patient_age = data.get("patient_age")

        print("Selected symptoms:", selected_symptoms)

        # Remove None, undefined, empty strings
        selected_symptoms = [
            str(s).strip()
            for s in selected_symptoms
            if s is not None and str(s).strip()
        ]

        print("Clean symptoms:", selected_symptoms)

        # Validate age
        try:
            patient_age = int(patient_age)
            if not (1 <= patient_age <= 120):
                patient_age = None
        except (ValueError, TypeError):
            patient_age = None

        if not selected_symptoms:
            return JsonResponse(
                {"error": "No symptoms selected"},
                status=400
            )

        # Build feature vector
        input_vector = np.zeros(len(symptoms))

        for symptom in selected_symptoms:
            if symptom in symptoms:
                idx = symptoms.index(symptom)
                input_vector[idx] = 1

        # Predict
        probabilities = model.predict_proba([input_vector])[0]
        top_indices = np.argsort(probabilities)[::-1][:3]

        predictions = []

        for idx in top_indices:
            disease = encoder.classes_[idx]
            probability = float(probabilities[idx])

            if probability < 0.01:
                continue

            predictions.append({
                "disease": disease,
                "probability": round(probability * 100, 2)
            })

        # Save history
        if predictions:
            top = predictions[0]

            PredictionSession.objects.create(
                patient_name=patient_name,
                patient_age=patient_age,
                symptoms=",".join(selected_symptoms),
                symptoms_count=int(np.sum(input_vector)),
                predictions=predictions,
                top_disease=top["disease"],
                top_probability=top["probability"]
            )

        return JsonResponse({
            "success": True,
            "predictions": predictions,
            "symptoms_count": int(np.sum(input_vector))
        })

    except Exception as e:
        traceback.print_exc()

        return JsonResponse({
            "error": str(e)
        }, status=500)

def get_symptoms(request):                          # api to get symptoms
    return JsonResponse({
        "symptoms": [
            {"key": s, "label": format_symptom_label(s)}
            for s in symptoms
        ]
    })

def get_symptom_category(symptom):
    s = symptom.lower()

    if any(x in s for x in ["pain", "abdominal", "cramp"]):
        return "pain"

    elif any(x in s for x in ["diarrhea", "constipation", "stool", "bowel"]):
        return "bowel"

    elif any(x in s for x in ["nausea", "vomit", "acidity", "heartburn"]):
        return "digestive"

    elif any(x in s for x in ["fever", "fatigue", "weight", "weak"]):
        return "systemic"

    elif any(x in s for x in ["jaundice", "liver", "yellow"]):
        return "liver"

    else:
        return "other"

def history(request):
    sessions = PredictionSession.objects.all().order_by("-id")

    return render(request, "predictor/history.html", {
        "sessions": sessions
    })

# def clear_history(request):
#     pass

@csrf_exempt
def clear_history(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        deleted_count, _ = PredictionSession.objects.all().delete()

        return JsonResponse({
            "success": True,
            "deleted": deleted_count
        })

    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

def about(request):
    return render(request, "predictor/about.html")

# # Load your trained model
# model = joblib.load("ml/model.pkl")
#
# # If you have label encoder
# label_encoder = joblib.load("ml/label_encoder.pkl")


# def home(request):
#     form = SymptomForm()
#     return render(request, "predictor/index.html", {"form": form})
#
#
# def predict(request):
#     if request.method == "POST":
#         form = SymptomForm(request.POST)
#
#         if form.is_valid():
#             selected_symptoms = form.cleaned_data["symptoms"]
#
#             # Convert to binary vector (IMPORTANT)
#             input_vector = symptom_to_vector(selected_symptoms)
#
#             prediction = model.predict([input_vector])[0]
#             probability = max(model.predict_proba([input_vector])[0])
#
#             disease = label_encoder.inverse_transform([prediction])[0]
#
#             # Save history
#             PredictionHistory.objects.create(
#                 symptoms=",".join(selected_symptoms),
#                 prediction=disease,
#                 probability=probability
#             )
#
#             return render(request, "result.html", {
#                 "disease": disease,
#                 "probability": round(probability * 100, 2)
#             })
#
#     return redirect("home")
#
#
# def history(request):
#     records = PredictionHistory.objects.all().order_by("-created_at")
#     return render(request, "predictor/history.html", {"records": records})
#
#
# def about(request):
#     return render(request, "predictor/about.html")
#
#
# # 🔥 Convert symptoms → model input vector
# def symptom_to_vector(selected_symptoms):
#     from .forms import SYMPTOMS
#
#     return [1 if symptom in selected_symptoms else 0 for symptom in SYMPTOMS]