from django.db import models


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
    name = models.CharField(max_length=150, unique=True)         # e.g. "abdominal_pain"
    display_name = models.CharField(max_length=150, blank=True, default='')  # e.g. "Abdominal Pain"
    severity_weight = models.PositiveSmallIntegerField(default=1)  # from Symptom-severity.csv

    class Meta:
        ordering = ['name']
        verbose_name = 'Symptom'
        verbose_name_plural = 'Symptoms'

    def __str__(self):
        return self.display_name or self.name


class PredictionSession(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    patient_name = models.CharField(max_length=150, blank=True, default='')
    patient_age = models.PositiveSmallIntegerField(null=True, blank=True)

    symptoms = models.JSONField()
    symptoms_count = models.PositiveIntegerField(default=0)

    predictions = models.JSONField()
    top_disease = models.ForeignKey(
        Disease,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='prediction_sessions',
    )
    top_disease_name = models.CharField(max_length=200)  # fallback/snapshot if Disease record is later deleted/renamed
    top_probability = models.FloatField()
    top_severity = models.CharField(max_length=100, blank=True)
    top_specialist = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Prediction Session'
        verbose_name_plural = 'Prediction Sessions'

    def __str__(self):
        label = self.patient_name if self.patient_name else 'Anonymous'
        return f"{label} — {self.top_disease_name} ({self.top_probability:.1f}%) — {self.created_at.strftime('%Y-%m-%d %H:%M')}"

    @property
    def display_name(self):
        return self.patient_name if self.patient_name else 'Anonymous'