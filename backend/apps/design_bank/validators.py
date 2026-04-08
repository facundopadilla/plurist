import ipaddress
import socket
from urllib.parse import urlparse

from ninja.errors import HttpError

# 50 MB
MAX_FILE_SIZE = 50 * 1024 * 1024

# 30 seconds
DOWNLOAD_TIMEOUT = 30

# Max redirects when fetching URLs
MAX_REDIRECTS = 5

BLOCKED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),  # loopback
    ipaddress.ip_network("10.0.0.0/8"),  # RFC1918  # NOSONAR - intentionally blocked private network
    ipaddress.ip_network("172.16.0.0/12"),  # RFC1918  # NOSONAR - intentionally blocked private network
    ipaddress.ip_network("192.168.0.0/16"),  # RFC1918  # NOSONAR - intentionally blocked private network
    ipaddress.ip_network("169.254.0.0/16"),  # link-local / metadata service  # NOSONAR
    ipaddress.ip_network("::1/128"),  # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),  # IPv6 unique local
    ipaddress.ip_network("fe80::/10"),  # IPv6 link-local
]

ALLOWED_SCHEMES = {"http", "https"}


class SSRFError(Exception):
    pass


def _is_ip_blocked(ip_str: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip_str)
    except ValueError:
        return True  # cannot parse — block it
    for network in BLOCKED_NETWORKS:
        if addr in network:
            return True
    return False


def validate_url(url: str) -> str:
    """
    Validate a URL for SSRF safety. Returns the sanitised URL or raises HttpError.

    Steps:
    1. Parse and check scheme is http/https.
    2. Ensure a hostname is present.
    3. Resolve DNS to get the real IP.
    4. Block private/reserved IPs (prevents DNS rebinding too since we resolve once).
    """
    parsed = urlparse(url)

    if parsed.scheme.lower() not in ALLOWED_SCHEMES:
        raise HttpError(400, f"URL scheme '{parsed.scheme}' is not allowed. Use http or https.")

    hostname = parsed.hostname
    if not hostname:
        raise HttpError(400, "URL must include a hostname.")

    # Resolve DNS — prevents DNS rebinding by resolving at validation time
    try:
        resolved_ips = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise HttpError(400, f"Could not resolve hostname '{hostname}': {exc}") from exc

    for family, _type, _proto, _canonname, sockaddr in resolved_ips:
        ip_str = sockaddr[0]
        if _is_ip_blocked(ip_str):
            raise HttpError(400, f"URL resolves to a blocked IP address ({ip_str}).")

    return url


def validate_file_size(size_bytes: int) -> None:
    if size_bytes > MAX_FILE_SIZE:
        raise HttpError(
            400,
            f"File size {size_bytes} bytes exceeds the {MAX_FILE_SIZE // (1024 * 1024)} MB limit.",
        )


SAFE_CONTENT_TYPES = {
    "text/html",
    "text/css",
    "application/javascript",
    "text/javascript",
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
    "image/tiff",
}

# HTML/CSS/JS are stored as reference only — never executed
REFERENCE_ONLY_CONTENT_TYPES = {
    "text/html",
    "text/css",
    "application/javascript",
    "text/javascript",
}


def is_reference_only(content_type: str) -> bool:
    """Return True if the content type must be stored as reference only (not executed)."""
    base = content_type.split(";")[0].strip().lower()
    return base in REFERENCE_ONLY_CONTENT_TYPES
