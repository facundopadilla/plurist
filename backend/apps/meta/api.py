from ninja import Router

from .capabilities import get_network_capabilities

router = Router()


@router.get("/network-capabilities")
def network_capabilities(request):
    return get_network_capabilities()
