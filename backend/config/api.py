from django.http import Http404, HttpRequest
from ninja import NinjaAPI
from ninja.errors import HttpError

from apps.accounts.api import router as accounts_router
from apps.common.api import router as common_router
from apps.design_bank.api import router as design_bank_router
from apps.design_bank.brand_api import router as brand_profile_router
from apps.integrations.api import router as integrations_router
from apps.meta.api import router as meta_router
from apps.generation.api import router as generation_router
from apps.rendering.api import router as rendering_router

api = NinjaAPI(version="1", docs_url="/docs", openapi_url="/openapi.json")

api.add_router("/", common_router)
api.add_router("/auth/", accounts_router)
api.add_router("/meta/", meta_router)
api.add_router("/design-bank/", design_bank_router)
api.add_router("/brand-profile/", brand_profile_router)
api.add_router("/integrations/", integrations_router)
api.add_router("/rendering/", rendering_router)
api.add_router("/generation/", generation_router)


@api.exception_handler(Http404)
def not_found_handler(request: HttpRequest, exc: Http404):
    return api.create_response(request, {"detail": "Not Found"}, status=404)


@api.exception_handler(HttpError)
def http_error_handler(request: HttpRequest, exc: HttpError):
    return api.create_response(request, {"detail": exc.message}, status=exc.status_code)
