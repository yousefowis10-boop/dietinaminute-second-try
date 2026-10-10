from django.contrib.auth.models import AbstractUser
from django.db import models


class Clinic(models.Model):
    """A clinic groups several dietitians who share clients and branding."""
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    # True: every dietitian sees all the company's clients. False: each sees their own; the admin sees everyone's.
    share_clients = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class CustomUser(AbstractUser):
    PLAN_BASIC = 'basic'
    PLAN_PRO = 'pro'
    PLAN_CLINIC = 'clinic'
    PLAN_CHOICES = [
        (PLAN_BASIC, 'Basic (manual plans)'),
        (PLAN_PRO, 'Pro (includes AI)'),
        (PLAN_CLINIC, 'Clinic (several dietitians)'),
    ]

    is_subscribed = models.BooleanField(default=False)
    plan_tier = models.CharField(max_length=10, choices=PLAN_CHOICES, default=PLAN_BASIC)
    clinic = models.ForeignKey(Clinic, null=True, blank=True, on_delete=models.SET_NULL, related_name='members')
    is_clinic_admin = models.BooleanField(default=False)

    @property
    def has_ai_plan(self):
        return self.plan_tier in (self.PLAN_PRO, self.PLAN_CLINIC)
