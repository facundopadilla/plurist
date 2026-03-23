import json

from django.http import HttpResponse
from django.urls import path

from config.api import api


def _json_404(request, exception=None):
    return HttpResponse(
        json.dumps({"detail": "Not Found"}),
        content_type="application/json",
        status=404,
    )


handler404 = _json_404

urlpatterns = [
    path("api/v1/", api.urls),
]
