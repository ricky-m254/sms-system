from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ExamSessionViewSet, ExamPaperViewSet, ExamSeatAllocationViewSet,
    ExamResultViewSet, ExamGradeBoundaryViewSet, ExamResultAnalyticsView
)

router = DefaultRouter()
router.register('sessions', ExamSessionViewSet)
router.register('papers', ExamPaperViewSet)
router.register('seat-allocations', ExamSeatAllocationViewSet)
router.register('results', ExamResultViewSet)
router.register('grade-boundaries', ExamGradeBoundaryViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('analytics/', ExamResultAnalyticsView.as_view(), name='exam-analytics'),
]
