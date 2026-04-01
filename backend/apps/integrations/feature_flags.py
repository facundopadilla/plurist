import os

SUPPORTED_NETWORKS = ["linkedin", "x", "instagram"]

_FLAG_ENV_KEYS = {
    "linkedin": "FEATURE_LINKEDIN_LIVE",
    "x": "FEATURE_X_LIVE",
    "instagram": "FEATURE_INSTAGRAM_LIVE",
}


def is_live(network: str) -> bool:
    """Return True if the given network is in live mode (not mock)."""
    env_key = _FLAG_ENV_KEYS.get(network)
    if not env_key:
        return False
    return os.environ.get(env_key, "false").lower() in {"1", "true", "yes"}


def get_all_flags() -> dict[str, bool]:
    """Return a mapping of network -> live_mode for all supported networks."""
    return {network: is_live(network) for network in SUPPORTED_NETWORKS}


def set_flag(network: str, live: bool) -> None:
    """Set the in-process flag for a network (writes to os.environ)."""
    env_key = _FLAG_ENV_KEYS.get(network)
    if not env_key:
        raise ValueError(f"Unknown network: {network}")
    os.environ[env_key] = "true" if live else "false"
