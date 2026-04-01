"""Custom session auth without Django CSRF enforcement.

The app uses its own session-based CSRF via _require_csrf() on auth
mutations. Other API endpoints rely on session auth for identity but
don't need Django's cookie-based CSRF since they're a pure JSON API.
"""

from ninja.security import SessionAuth

session_auth = SessionAuth(csrf=False)
