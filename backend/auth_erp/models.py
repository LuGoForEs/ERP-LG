from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user         = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    totp_secret  = models.CharField(max_length=64, blank=True, default='')
    totp_enabled = models.BooleanField(default=False)

    class Meta:
        db_table = 'user_profiles'
