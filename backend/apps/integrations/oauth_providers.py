"""OAuth 2.0 provider registrations for social network connections."""

from authlib.integrations.django_client import OAuth
from django.conf import settings

social_oauth = OAuth()

social_oauth.register(
    name="x",
    client_id=settings.X_CLIENT_ID,
    client_secret=settings.X_CLIENT_SECRET,
    authorize_url="https://twitter.com/i/oauth2/authorize",
    access_token_url="https://api.twitter.com/2/oauth2/token",
    client_kwargs={
        "scope": "tweet.read tweet.write users.read offline.access",
        "token_endpoint_auth_method": "client_secret_basic",
    },
)

social_oauth.register(
    name="linkedin",
    client_id=settings.LINKEDIN_CLIENT_ID,
    client_secret=settings.LINKEDIN_CLIENT_SECRET,
    authorize_url="https://www.linkedin.com/oauth/v2/authorization",
    access_token_url="https://www.linkedin.com/oauth/v2/accessToken",
    client_kwargs={"scope": "w_member_social openid profile email"},
)

social_oauth.register(
    name="instagram",
    client_id=settings.INSTAGRAM_CLIENT_ID,
    client_secret=settings.INSTAGRAM_CLIENT_SECRET,
    authorize_url="https://www.facebook.com/v19.0/dialog/oauth",
    access_token_url="https://graph.facebook.com/v19.0/oauth/access_token",
    client_kwargs={
        "scope": "instagram_basic,instagram_content_publish,pages_show_list",
    },
)
