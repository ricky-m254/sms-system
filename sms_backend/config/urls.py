import os
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import FileResponse, HttpResponseNotFound

# This file handles TENANT ROUTES (School Data)
# Public Routes are now handled by config/public_urls.py


def _serve_react_app(request, path=""):
    frontend_dir = settings.BASE_DIR / "frontend_build"
    index_path = frontend_dir / "index.html"
    if index_path.exists():
        return FileResponse(open(index_path, "rb"), content_type="text/html")
    return HttpResponseNotFound("Frontend build not found. Run 'npm run build' in sms_frontend/.")


urlpatterns = [
    # 1. Admin Panel (For School Admins)
    path("admin/", admin.site.urls),

    # 2. School API Modules (Students, Finance, etc.)
    path("api/", include("school.urls")),

    # 3. Catch-all: serve the React SPA for any non-API route
    re_path(r"^(?!api/|admin/|static/|media/).*$", _serve_react_app),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
