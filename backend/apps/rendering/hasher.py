"""
Deterministic input hashing for the render cache.

The hash is computed over: template_key + brand_profile_version_id + input_variables
so that identical inputs always produce the same cache key.
"""

import hashlib
import json


def compute_input_hash(
    template_key: str,
    brand_profile_version_id: int,
    input_variables: dict,
) -> str:
    """Return a SHA-256 hex digest for the given render inputs."""
    payload = {
        "template_key": template_key,
        "brand_profile_version_id": brand_profile_version_id,
        "input_variables": input_variables,
    }
    # sort_keys ensures deterministic ordering regardless of dict insertion order
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


def compute_html_hash(html_content: str, fmt: str) -> str:
    """Return a SHA-256 hex digest for a direct HTML render."""
    canonical = json.dumps(
        {"html": html_content, "format": fmt},
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode()).hexdigest()
