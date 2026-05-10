from django.urls import path
from .views import (
    LoginView, RefreshView, LogoutView, MeView,
    TwoFAVerifyView, TwoFASetupView, TwoFAEnableView, TwoFADisableView,
)

urlpatterns = [
    path('login/',       LoginView.as_view()),
    path('refresh/',     RefreshView.as_view()),
    path('logout/',      LogoutView.as_view()),
    path('me/',          MeView.as_view()),
    path('2fa/setup/',   TwoFASetupView.as_view()),
    path('2fa/enable/',  TwoFAEnableView.as_view()),
    path('2fa/verify/',  TwoFAVerifyView.as_view()),
    path('2fa/disable/', TwoFADisableView.as_view()),
]
