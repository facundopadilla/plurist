from ninja import NinjaAPI

from apps.common.api import router as common_router

api = NinjaAPI(version="1", docs_url="/docs", openapi_url="/openapi.json")

api.add_router("/", common_router)
