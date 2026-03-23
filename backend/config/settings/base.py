import os
import urllib.parse as _up

_DEFAULT_SECRET = "unsafe-dev-secret-key-change-in-production"
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", _DEFAULT_SECRET)

DEBUG = os.environ.get("DEBUG", "true").lower() == "true"

ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgres://socialclaw:socialclaw@localhost:5432/socialclaw",
)

_db_url = DATABASE_URL
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql://", 1)

_parsed = _up.urlparse(_db_url)

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": _parsed.path.lstrip("/"),
        "USER": _parsed.username,
        "PASSWORD": _parsed.password,
        "HOST": _parsed.hostname,
        "PORT": str(_parsed.port or 5432),
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

USE_TZ = True
TIME_ZONE = "UTC"
LANGUAGE_CODE = "en-us"

CELERY_BROKER_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
