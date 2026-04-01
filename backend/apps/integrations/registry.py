from __future__ import annotations

from apps.integrations.adapters import BaseAdapter
from apps.integrations.feature_flags import is_live
from apps.integrations.providers.instagram import InstagramAdapter
from apps.integrations.providers.linkedin import LinkedInAdapter
from apps.integrations.providers.mock_adapter import MockAdapter
from apps.integrations.providers.x import XAdapter

# Registry maps network name -> live adapter class.
# When a live adapter is not yet implemented the value is None.
_LIVE_REGISTRY: dict[str, type[BaseAdapter] | None] = {
    "linkedin": LinkedInAdapter,
    "x": XAdapter,
    "instagram": InstagramAdapter,
}


def get_adapter(network: str) -> BaseAdapter:
    """Return the appropriate adapter for the given network.

    Returns the live adapter when the feature flag is on AND a live adapter
    class is registered. Falls back to MockAdapter otherwise.
    """
    if is_live(network):
        live_cls = _LIVE_REGISTRY.get(network)
        if live_cls is not None:
            return live_cls()

    return MockAdapter(network)


def register_live_adapter(network: str, adapter_cls: type[BaseAdapter]) -> None:
    """Register a live adapter class for a network (for use by live providers)."""
    if network not in _LIVE_REGISTRY:
        raise ValueError(f"Unknown network: {network}")
    _LIVE_REGISTRY[network] = adapter_cls
