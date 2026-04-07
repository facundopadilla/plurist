from django.contrib import admin

from .models import ProjectSkill, Skill


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("name", "source", "author", "icon", "install_count", "is_active", "created_at")
    list_filter = ("is_active", "source")
    search_fields = ("name", "description", "author", "slug")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("install_count", "created_at", "updated_at")


@admin.register(ProjectSkill)
class ProjectSkillAdmin(admin.ModelAdmin):
    list_display = ("project", "skill", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("project__name", "skill__name")
