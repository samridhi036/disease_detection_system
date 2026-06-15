from django.db import models
from django.contrib.auth.models import User


class Disease(models.Model):
    CATEGORY_CHOICES = [
        ('gastro', 'Gastrointestinal'),
        ('hepato', 'Hepatology'),
    ]
    name = models.CharField(max_length=200, unique=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    description = models.TextField(blank=True, default='')
    precautions = models.JSONField(default=list, blank=True)
    specialist = models.CharField(max_length=200, blank=True, default='')

    class Meta:
        ordering = ['name']
        verbose_name = 'Disease'
        verbose_name_plural = 'Diseases'

    def __str__(self):
        return self.name


class Symptom(models.Model):
    name = models.CharField(max_length=150, unique=True)
    display_name = models.CharField(max_length=150, blank=True, default='')
    severity_weight = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ['name']
        verbose_name = 'Symptom'
        verbose_name_plural = 'Symptoms'

    def __str__(self):
        return self.display_name or self.name


class PredictionSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='prediction_sessions')
    created_at = models.DateTimeField(auto_now_add=True)
    patient_name = models.CharField(max_length=150, blank=True, default='')
    patient_age = models.PositiveSmallIntegerField(null=True, blank=True)
    symptoms = models.JSONField(default=list)
    symptoms_count = models.PositiveIntegerField(default=0)
    predictions = models.JSONField(default=list)
    top_disease = models.CharField(max_length=200, default='')
    top_probability = models.FloatField(default=0)
    top_severity = models.CharField(max_length=100, blank=True, default='')
    top_specialist = models.CharField(max_length=200, blank=True, default='')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Prediction Session'
        verbose_name_plural = 'Prediction Sessions'

    def __str__(self):
        label = self.patient_name if self.patient_name else (self.user.username if self.user else 'Anonymous')
        return f"{label} — {self.top_disease} ({self.top_probability:.1f}%) — {self.created_at.strftime('%Y-%m-%d %H:%M')}"
