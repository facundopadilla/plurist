from django.conf import settings
from django.db import models

from apps.accounts.models import Workspace
from apps.posts.models import BrandProfileVersion


class ChatConversation(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="chat_conversations",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_conversations",
    )
    format = models.CharField(max_length=20, default="ig_square")
    network = models.CharField(max_length=50, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="chat_conversations",
    )
    created_at = models.DateTimeField(auto_now_add=True)


class ChatMessage(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    conversation = models.ForeignKey(
        ChatConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()
    html_blocks = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)


class CompareRun(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        PARTIAL_FAILURE = "partial_failure", "Partial Failure"

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="compare_runs",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="compare_runs",
    )
    brand_profile_version = models.ForeignKey(
        BrandProfileVersion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="compare_runs",
    )
    template_key = models.CharField(max_length=255, blank=True)
    format = models.CharField(max_length=20, default="ig_square")
    slide_count = models.PositiveSmallIntegerField(null=True, blank=True)
    width = models.PositiveIntegerField(default=1080)
    height = models.PositiveIntegerField(default=1080)
    campaign_brief = models.TextField()
    target_network = models.CharField(max_length=50, blank=True)
    providers = models.JSONField(default=list)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="compare_runs",
    )
    created_at = models.DateTimeField(auto_now_add=True)
