from django.contrib import admin

from .models import WorkspaceAPIKey


@admin.register(WorkspaceAPIKey)
class WorkspaceAPIKeyAdmin(admin.ModelAdmin):
    list_display = ("name", "prefix", "role", "is_active", "created_at", "last_used_at")
    list_filter = ("is_active", "role")
    search_fields = ("name", "prefix")
    readonly_fields = ("prefix", "key_hash", "created_at", "last_used_at")
    ordering = ("-created_at",)
