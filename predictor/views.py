import joblib
import numpy as np
import json
import traceback
import pandas as pd

from pathlib import Path
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate as auth_authenticate
from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required

from .models import PredictionSession

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "ml" / "saved_models"

model = joblib.load(MODEL_DIR / "random_forest.pkl")
encoder = joblib.load(MODEL_DIR / "label_encoder.pkl")

model_features = list(model.feature_names_in_)

_DATASET_PATH = BASE_DIR / "dataset" / "gastro_diseases.xlsx"
_df = pd.read_excel(_DATASET_PATH, sheet_name='disease_filtered_data')
display_symptoms = [c.strip() for c in _df.columns if c.strip() != 'prognosis']


def format_symptom_label(symptom):
    return symptom.strip().replace("_", " ").title()


def get_symptom_category(symptom):
    s = symptom.lower()
    if any(x in s for x in ["pain", "abdominal", "cramp", "tenderness", "rebound"]):
        return "pain"
    elif any(x in s for x in ["diarrhea", "constipation", "stool", "bowel", "rectal", "defecation", "tenesmus"]):
        return "bowel"
    elif any(x in s for x in ["nausea", "vomit", "acidity", "heartburn", "indigestion", "regurgitation", "belching"]):
        return "digestive"
    elif any(x in s for x in ["fever", "fatigue", "weight", "weak", "chills", "sweat", "anxiety", "mood"]):
        return "systemic"
    elif any(x in s for x in ["jaundice", "liver", "yellow", "bile", "clay", "dark_urine", "spider"]):
        return "liver"
    else:
        return "other"


def login(request):
    if request.user.is_authenticated:
        return redirect('index')

    error = None
    identifier = ''

    if request.method == 'POST':
        identifier = request.POST.get('identifier', '').strip()
        password = request.POST.get('password', '')

        user = None
        if '@' in identifier:
            try:
                u = User.objects.get(email__iexact=identifier)
                user = auth_authenticate(request, username=u.username, password=password)
            except User.DoesNotExist:
                pass
        else:
            user = auth_authenticate(request, username=identifier, password=password)

        if user is not None:
            auth_login(request, user)
            return redirect('index')
        else:
            error = 'Invalid username/email or password. Please try again.'

    return render(request, 'predictor/login.html', {'error': error, 'identifier': identifier})


def logout(request):
    auth_logout(request)
    return redirect('login')


def register(request):
    if request.user.is_authenticated:
        return redirect('index')

    errors = []
    form_data = {}

    if request.method == 'POST':
        form_data = request.POST
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        username = request.POST.get('username', '').strip()
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')
        confirm_password = request.POST.get('confirm_password', '')

        if not first_name:
            errors.append('First name is required.')
        if not last_name:
            errors.append('Last name is required.')
        if not username:
            errors.append('Username is required.')
        elif User.objects.filter(username__iexact=username).exists():
            errors.append('That username is already taken.')
        if not email or '@' not in email or '.' not in email.split('@')[-1]:
            errors.append('A valid email address is required.')
        elif User.objects.filter(email__iexact=email).exists():
            errors.append('An account with that email already exists.')
        if len(password) < 8:
            errors.append('Password must be at least 8 characters long.')
        elif not any(c.isupper() for c in password):
            errors.append('Password must contain at least one uppercase letter.')
        elif not any(c.isdigit() for c in password):
            errors.append('Password must contain at least one number.')
        elif not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in password):
            errors.append('Password must contain at least one special character.')
        if password and confirm_password and password != confirm_password:
            errors.append('Passwords do not match.')

        if not errors:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            auth_login(request, user)
            return redirect('index')

    return render(request, 'predictor/register.html', {'errors': errors, 'form_data': form_data})


@login_required(login_url='/login/')
def index(request):
    symptoms_list = [
        {
            "key": s,
            "label": format_symptom_label(s),
            "category": get_symptom_category(s)
        }
        for s in display_symptoms
    ]

    return render(request, "predictor/index.html", {
        "symptoms": symptoms_list,
        "total_symptoms": len(symptoms_list),
        "model_ready": True
    })


@csrf_exempt
@login_required(login_url='/login/')
def predict(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
        selected_symptoms = data.get("symptoms", [])
        patient_name = (data.get("patient_name") or "").strip()[:150]
        patient_age = data.get("patient_age")

        selected_symptoms = [
            str(s).strip()
            for s in selected_symptoms
            if s is not None and str(s).strip()
        ]

        try:
            patient_age = int(patient_age)
            if not (1 <= patient_age <= 120):
                patient_age = None
        except (ValueError, TypeError):
            patient_age = None

        if len(selected_symptoms) < 5:
            return JsonResponse({"error": "Please select at least 5 symptoms."}, status=400)

        input_vector = np.zeros(len(model_features))
        for symptom in selected_symptoms:
            if symptom in model_features:
                idx = model_features.index(symptom)
                input_vector[idx] = 1

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

        if predictions:
            top = predictions[0]
            PredictionSession.objects.create(
                user=request.user,
                patient_name=patient_name,
                patient_age=patient_age,
                symptoms=selected_symptoms,
                symptoms_count=int(np.sum(input_vector)),
                predictions=predictions,
                top_disease=top["disease"],
                top_probability=top["probability"],
                top_severity='',
                top_specialist=''
            )

        return JsonResponse({
            "success": True,
            "predictions": predictions,
            "symptoms_count": int(np.sum(input_vector))
        })

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


def get_symptoms(request):
    return JsonResponse({
        "symptoms": [
            {"key": s, "label": format_symptom_label(s)}
            for s in display_symptoms
        ]
    })


@login_required(login_url='/login/')
def history(request):
    search_name = request.GET.get('name', '').strip()
    sessions = PredictionSession.objects.filter(user=request.user)

    if search_name:
        sessions = sessions.filter(patient_name__icontains=search_name)

    total_sessions = sessions.count()
    unique_diseases = sessions.values('top_disease').distinct().count()

    avg_symptoms = 0
    avg_confidence = 0
    if total_sessions:
        avg_symptoms = round(sum(s.symptoms_count for s in sessions) / total_sessions, 1)
        avg_confidence = round(sum(s.top_probability for s in sessions) / total_sessions, 1)

    disease_counts = {}
    for s in sessions:
        disease_counts[s.top_disease] = disease_counts.get(s.top_disease, 0) + 1

    top_disease_chart = []
    if disease_counts:
        max_count = max(disease_counts.values())
        for disease, count in sorted(disease_counts.items(), key=lambda x: -x[1])[:5]:
            top_disease_chart.append({
                'disease': disease,
                'count': count,
                'pct': round(count / max_count * 100)
            })

    patient_names = list(
        PredictionSession.objects.filter(user=request.user)
        .exclude(patient_name='')
        .values_list('patient_name', flat=True)
        .distinct()
    )

    return render(request, "predictor/history.html", {
        "sessions": sessions,
        "total_sessions": total_sessions,
        "unique_diseases": unique_diseases,
        "avg_symptoms": avg_symptoms,
        "avg_confidence": avg_confidence,
        "top_disease_chart": top_disease_chart,
        "search_name": search_name,
        "patient_names": patient_names,
    })


@csrf_exempt
@login_required(login_url='/login/')
def clear_history(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        deleted_count, _ = PredictionSession.objects.filter(user=request.user).delete()
        return JsonResponse({"success": True, "deleted": deleted_count})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)


def about(request):
    return render(request, "predictor/about.html")
