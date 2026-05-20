from django.urls import path
from .views import (
    OFTrazabilidadView, OFListView,
    TicketListCreateView, TicketDetailView, TicketCommentCreateView,
    TicketAttachmentListCreateView, TicketAttachmentDownloadView, TicketAttachmentDeleteView,
)


urlpatterns = [
    path('of/', OFListView.as_view(), name='soporte-of-list'),
    path('of/<int:of_id>/trazabilidad/', OFTrazabilidadView.as_view(), name='soporte-of-trazabilidad'),

    path('tickets/', TicketListCreateView.as_view(), name='soporte-tickets'),
    path('tickets/<int:pk>/', TicketDetailView.as_view(), name='soporte-ticket-detail'),
    path('tickets/<int:pk>/comments/', TicketCommentCreateView.as_view(), name='soporte-ticket-comments'),

    path('tickets/<int:ticket_id>/attachments/', TicketAttachmentListCreateView.as_view(), name='soporte-ticket-attachments'),
    path('tickets/<int:ticket_id>/attachments/<int:aid>/download/', TicketAttachmentDownloadView.as_view(), name='soporte-ticket-attachment-download'),
    path('tickets/<int:ticket_id>/attachments/<int:aid>/', TicketAttachmentDeleteView.as_view(), name='soporte-ticket-attachment-delete'),
]
