from django.urls import path

from .views import SSEStreamView

urlpatterns = [
    path('stream', SSEStreamView.as_view()),
]
