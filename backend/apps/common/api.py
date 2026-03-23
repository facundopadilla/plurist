from ninja import Router

router = Router()


@router.get("/health")
def health(request):
    return {"status": "ok"}
