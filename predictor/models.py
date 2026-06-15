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

# class Register(models.Model):
#     first_name = models.CharField(max_length=200)
#     middle_name = models.CharField(max_length=200)
#     last_name = models.CharField(max_length=200)
#     username = models.CharField(max_length=200)
#     email = models.EmailField()
#     contact = models.CharField(max_length=200)
#     dob = models.DateField()
#     password = models.CharField(max_length=200)
#
#
#
# class Login:
#     username = models.CharField(max_length=200)
#     email = models.EmailField()
#     password = models.CharField(max_length=200)
from django.db import models
from django.core.validators import RegexValidator, MinLengthValidator
from django.contrib.auth.hashers import make_password, check_password


class Register(models.Model):
    # Phone number validator
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )

    first_name = models.CharField(max_length=200)
    middle_name = models.CharField(max_length=200, blank=True, null=True)
    last_name = models.CharField(max_length=200)
    username = models.CharField(max_length=200, unique=True)
    email = models.EmailField(max_length=254, unique=True)
    contact = models.CharField(max_length=17, validators=[phone_regex])
    dob = models.DateField()
    password = models.CharField(max_length=128)  # Increased for hash storage
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.username} - {self.email}"

    def save(self, *args, **kwargs):
        # Hash password before saving
        if not self.password.startswith('pbkdf2_sha256$'):
            self.password = make_password(self.password)
        super().save(*args, **kwargs)

    def check_password(self, raw_password):
        """Check password against stored hash"""
        return check_password(raw_password, self.password)


class Login(models.Model):
    user = models.ForeignKey(Register, on_delete=models.CASCADE)
    login_time = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    is_successful = models.BooleanField(default=True)

    class Meta:
        ordering = ['-login_time']

    def __str__(self):
        return f"{self.user.username} logged in at {self.login_time}"

    @classmethod
    def authenticate(cls, username=None, email=None, password=None):
        """Authenticate user with username or email and password"""
        try:
            if email:
                user = Register.objects.get(email=email)
            elif username:
                user = Register.objects.get(username=username)
            else:
                return None

            if user.check_password(password):
                # Create login record
                cls.objects.create(user=user, is_successful=True)
                return user
            else:
                # Create failed login attempt record
                cls.objects.create(user=user, is_successful=False)
                return None

        except Register.DoesNotExist:
            return None

    @classmethod
    def get_login_history(cls, user):
        return cls.objects.filter(user=user)[:10]