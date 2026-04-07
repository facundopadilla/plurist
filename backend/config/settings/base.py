import os
import urllib.parse as _up

_DEFAULT_SECRET = "unsafe-dev-secret-key-change-in-production"
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", _DEFAULT_SECRET)

DEBUG = os.environ.get("DEBUG", "true").lower() == "true"

ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "ninja",
    "apps.common",
    "apps.accounts",
    "apps.workspace",
    "apps.posts",
    "apps.meta",
    "apps.design_bank",
    "apps.rendering",
    "apps.generation",
    "apps.analytics",
    "apps.projects",
    "apps.skills",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    # Django CSRF middleware is disabled; the API uses session-based custom
    # CSRF via _require_csrf() on auth mutations (login, logout, invites).
    "django.contrib.auth.middleware.AuthenticationMiddleware",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
            ],
        },
    }
]

ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

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

AUTH_USER_MODEL = "accounts.User"

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"

if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

USE_TZ = True
TIME_ZONE = "UTC"
LANGUAGE_CODE = "en-us"

CELERY_BROKER_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
CELERY_RESULT_BACKEND = CELERY_BROKER_URL

GOOGLE_OIDC_CLIENT_ID = os.environ.get("GOOGLE_OIDC_CLIENT_ID", "")
GOOGLE_OIDC_CLIENT_SECRET = os.environ.get("GOOGLE_OIDC_CLIENT_SECRET", "")
GOOGLE_ALLOWED_DOMAINS = [
    domain.strip().lower() for domain in os.environ.get("GOOGLE_ALLOWED_DOMAINS", "").split(",") if domain.strip()
]

# MinIO / S3 storage (design bank + project icons)
_minio_endpoint = os.environ.get("MINIO_ENDPOINT", "minio:9000")
DESIGN_BANK_S3_ENDPOINT_URL = f"http://{_minio_endpoint}"
DESIGN_BANK_S3_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "socialclaw")
DESIGN_BANK_S3_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "socialclaw")
DESIGN_BANK_S3_BUCKET = os.environ.get("MINIO_BUCKET", "design-bank")
DESIGN_BANK_S3_REGION = os.environ.get("MINIO_REGION", "us-east-1")
# Public URL for presigned URLs (rewrite internal hostname to browser-accessible host)
DESIGN_BANK_S3_PUBLIC_URL = os.environ.get("MINIO_PUBLIC_URL", "http://localhost:9000")

# Social network OAuth credentials
X_CLIENT_ID = os.environ.get("X_CLIENT_ID", "")
X_CLIENT_SECRET = os.environ.get("X_CLIENT_SECRET", "")
LINKEDIN_CLIENT_ID = os.environ.get("LINKEDIN_CLIENT_ID", "")
LINKEDIN_CLIENT_SECRET = os.environ.get("LINKEDIN_CLIENT_SECRET", "")
INSTAGRAM_CLIENT_ID = os.environ.get("INSTAGRAM_CLIENT_ID", "")
INSTAGRAM_CLIENT_SECRET = os.environ.get("INSTAGRAM_CLIENT_SECRET", "")
SOCIAL_TOKEN_ENCRYPTION_KEY = os.environ.get("SOCIAL_TOKEN_ENCRYPTION_KEY", "")

# AI provider key encryption.
# Resolution order (AIKeyVault): AI_ENCRYPTION_KEY → SOCIAL_TOKEN_ENCRYPTION_KEY → SECRET_KEY
AI_ENCRYPTION_KEY = os.environ.get("AI_ENCRYPTION_KEY", "")

# Celery Beat schedule
CELERY_BEAT_SCHEDULE = {}
