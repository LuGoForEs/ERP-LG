from django.db import models


class Notification(models.Model):
    created_at  = models.DateTimeField(auto_now_add=True, db_index=True)
    source_node = models.CharField(max_length=20)
    target_node = models.CharField(max_length=20, db_index=True)
    event_type  = models.CharField(max_length=40)
    message     = models.CharField(max_length=300)
    ref_type    = models.CharField(max_length=40, blank=True, default='')
    ref_id      = models.CharField(max_length=40, blank=True, default='')

    class Meta:
        db_table = 'notificaciones'
        ordering = ['-id']

    def as_payload(self):
        return {
            'id': self.id,
            'source': self.source_node,
            'target': self.target_node,
            'type': self.event_type,
            'message': self.message,
            'ref_type': self.ref_type,
            'ref_id': self.ref_id,
            'created_at': self.created_at.isoformat(),
        }
