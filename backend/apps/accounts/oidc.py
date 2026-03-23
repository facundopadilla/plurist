from authlib.integrations.django_client import OAuth
from django.conf import settings

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_OIDC_CLIENT_ID,
    client_secret=settings.GOOGLE_OIDC_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)
