from django.urls import path
from .views import AcademicYearsRefView, TermsRefView, ClassesRefView

urlpatterns = [
    path("ref/academic-years/", AcademicYearsRefView.as_view(), name="academics_ref_years"),
    path("ref/terms/", TermsRefView.as_view(), name="academics_ref_terms"),
    path("ref/classes/", ClassesRefView.as_view(), name="academics_ref_classes"),
]
