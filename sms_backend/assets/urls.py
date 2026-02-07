from django.urls import path
from .views import AssetsRefView

urlpatterns = [
    path("ref/assets/", AssetsRefView.as_view(), name="assets_ref_assets"),
]
