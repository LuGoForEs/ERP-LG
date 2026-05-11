from django.urls import path
from .views import (
    LoginView, RefreshView, LogoutView, MeView,
    TwoFAVerifyView, TwoFASetupView, TwoFAEnableView, TwoFADisableView,
    UserListView, UserCreateView, UserDetailView, ActivateAccountView,
    ResendActivationView, ActivationLinkView,
    PasswordResetRequestView, PasswordResetConfirmView,
)

urlpatterns = [
    path('login/',          LoginView.as_view()),
    path('refresh/',        RefreshView.as_view()),
    path('logout/',         LogoutView.as_view()),
    path('me/',             MeView.as_view()),
    path('2fa/setup/',      TwoFASetupView.as_view()),
    path('2fa/enable/',     TwoFAEnableView.as_view()),
    path('2fa/verify/',     TwoFAVerifyView.as_view()),
    path('2fa/disable/',    TwoFADisableView.as_view()),
    # User management (SuperUser only)
    path('users/',                            UserListView.as_view()),
    path('users/create/',                     UserCreateView.as_view()),
    path('users/resend-activation/',          ResendActivationView.as_view()),
    path('users/<int:pk>/',                   UserDetailView.as_view()),
    path('users/<int:pk>/activation-link/',   ActivationLinkView.as_view()),
    path('activate/',                         ActivateAccountView.as_view()),
    path('password-reset/',                   PasswordResetRequestView.as_view()),
    path('password-reset/confirm/',           PasswordResetConfirmView.as_view()),
]
