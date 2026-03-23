from django.conf import settings


def test_settings_importable():
    assert settings.configured


def test_installed_apps_present():
    assert "django.contrib.auth" in settings.INSTALLED_APPS


def test_databases_configured():
    assert "default" in settings.DATABASES
    assert settings.DATABASES["default"]["ENGINE"] == "django.db.backends.postgresql"
