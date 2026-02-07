from django.contrib import admin
from django.urls import path, include

# This file handles TENANT ROUTES (School Data)
# Public Routes are now handled by config/public_urls.py

urlpatterns = [
    # 1. Admin Panel (For School Admins)
    path("admin/", admin.site.urls),
    
    # 2. School API Modules (Students, Finance, etc.)
    path("api/", include("school.urls")),
]