from django.core.exceptions import ValidationError

NETWORK_CAPABILITIES = {
    "linkedin": {
        "network": "linkedin",
        "requires_image": False,
        "max_images": 1,
        "supports_text": True,
        "text_max_chars": 3000,
    },
    "x": {
        "network": "x",
        "requires_image": False,
        "max_images": 1,
        "supports_text": True,
        "text_max_chars": 280,
    },
    "instagram": {
        "network": "instagram",
        "requires_image": True,
        "max_images": 1,
        "supports_text": True,
        "text_max_chars": 2200,
    },
}


def get_network_capabilities():
    return [NETWORK_CAPABILITIES[key] for key in ["linkedin", "x", "instagram"]]


def validate_publish_payload(
    network: str, body_text: str = "", has_image: bool = False
):
    if network not in NETWORK_CAPABILITIES:
        raise ValidationError("Unsupported network")

    capability = NETWORK_CAPABILITIES[network]
    if capability["requires_image"] and not has_image:
        raise ValidationError(f"{network} requires at least one image")

    if (
        capability["supports_text"]
        and len(body_text or "") > capability["text_max_chars"]
    ):
        raise ValidationError(f"{network} text exceeds max length")
