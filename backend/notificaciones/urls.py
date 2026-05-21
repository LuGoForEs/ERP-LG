from django.urls import path

from .views import SSEStreamView, RecentNotificationsView

urlpatterns = [
    path('stream', SSEStreamView.as_view()),
    path('recent', RecentNotificationsView.as_view()),
]
