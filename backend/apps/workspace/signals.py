from django.core.exceptions import ValidationError
from django.db.models.signals import pre_save
from django.dispatch import receiver

from apps.accounts.models import Workspace


@receiver(pre_save, sender=Workspace)
def enforce_single_workspace(sender, instance, **kwargs):
    existing = sender.objects.all()
    if instance.pk:
        existing = existing.exclude(pk=instance.pk)

    if existing.exists():
        raise ValidationError("Only one workspace is allowed")
