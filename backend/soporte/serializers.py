from rest_framework import serializers
from .models import Ticket, TicketComment, TicketAttachment


def _user_label(user):
    if not user:
        return ''
    return (f"{user.first_name} {user.last_name}".strip()
            or user.username or user.email or '')


class TicketAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TicketAttachment
        fields = [
            'id', 'ticket_id', 'original_name', 'content_type', 'size',
            'uploaded_by_id', 'uploaded_by_name', 'created_at',
        ]
        read_only_fields = fields

    def get_uploaded_by_name(self, obj):
        return _user_label(obj.uploaded_by)


class TicketCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_email = serializers.EmailField(source='author.email', read_only=True)

    class Meta:
        model = TicketComment
        fields = ['id', 'ticket_id', 'author_id', 'author_name', 'author_email', 'body', 'created_at']
        read_only_fields = ['id', 'ticket_id', 'author_id', 'author_name', 'author_email', 'created_at']

    def get_author_name(self, obj):
        return _user_label(obj.author)


class TicketSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    assignee_name = serializers.SerializerMethodField()
    numero = serializers.IntegerField(source='id', read_only=True)
    comments = TicketCommentSerializer(many=True, read_only=True)
    attachments = TicketAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'numero',
            'created_by_id', 'created_by_name',
            'assignee_id', 'assignee_name',
            'subject', 'body',
            'status', 'priority',
            'snapshot_full_name', 'snapshot_email', 'snapshot_role',
            'created_at', 'updated_at',
            'comments', 'attachments',
        ]
        read_only_fields = [
            'id', 'numero', 'created_by_id', 'created_by_name', 'assignee_name',
            'snapshot_full_name', 'snapshot_email', 'snapshot_role',
            'created_at', 'updated_at', 'comments', 'attachments',
        ]

    def get_created_by_name(self, obj):
        return _user_label(obj.created_by)

    def get_assignee_name(self, obj):
        return _user_label(obj.assignee)


class TicketCreateSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=200)
    body = serializers.CharField()
    priority = serializers.ChoiceField(choices=Ticket.PRIORITY_CHOICES, default='media', required=False)
