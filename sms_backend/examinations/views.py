from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Avg, Max, Count
from school.permissions import HasModuleAccess
from .models import ExamSession, ExamPaper, ExamSeatAllocation, ExamResult, ExamGradeBoundary
from .serializers import (
    ExamSessionSerializer, ExamPaperSerializer, ExamSeatAllocationSerializer,
    ExamResultSerializer, ExamGradeBoundarySerializer
)

class ExamSessionViewSet(viewsets.ModelViewSet):
    queryset = ExamSession.objects.all().order_by('-created_at')
    serializer_class = ExamSessionSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "EXAMINATIONS"

class ExamPaperViewSet(viewsets.ModelViewSet):
    queryset = ExamPaper.objects.all().order_by('-exam_date')
    serializer_class = ExamPaperSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "EXAMINATIONS"
    filterset_fields = ['session', 'subject', 'school_class']

class ExamSeatAllocationViewSet(viewsets.ModelViewSet):
    queryset = ExamSeatAllocation.objects.all()
    serializer_class = ExamSeatAllocationSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "EXAMINATIONS"
    filterset_fields = ['paper', 'student']

class ExamResultViewSet(viewsets.ModelViewSet):
    queryset = ExamResult.objects.all()
    serializer_class = ExamResultSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "EXAMINATIONS"
    filterset_fields = ['paper', 'student']

    @action(detail=False, methods=['post'], url_path='calculate-positions')
    def calculate_positions(self, request):
        paper_id = request.data.get('paper_id')
        if not paper_id:
            return Response({"error": "paper_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        results = ExamResult.objects.filter(paper_id=paper_id).order_by('-marks_obtained')
        for i, res in enumerate(results):
            res.position = i + 1
            res.save()
        
        return Response({"message": f"Positions calculated for {results.count()} results"}, status=status.HTTP_200_OK)

class ExamGradeBoundaryViewSet(viewsets.ModelViewSet):
    queryset = ExamGradeBoundary.objects.all()
    serializer_class = ExamGradeBoundarySerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "EXAMINATIONS"
    filterset_fields = ['session']

class ExamResultAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "EXAMINATIONS"

    def get(self, request):
        session_id = request.query_params.get('session')
        class_id = request.query_params.get('class_id')
        
        results_qs = ExamResult.objects.all()
        if session_id:
            results_qs = results_qs.filter(paper__session_id=session_id)
        if class_id:
            results_qs = results_qs.filter(paper__school_class_id=class_id)
            
        if not results_qs.exists():
            return Response({"message": "No results found for given filters"}, status=status.HTTP_404_NOT_FOUND)

        class_avg = results_qs.aggregate(avg=Avg('marks_obtained'))['avg']
        
        # Pass rate calculation
        total_results = results_qs.count()
        # Using paper's pass_mark is tricky if it varies. Assuming common pass mark or calculating per paper.
        # But instructions ask for class average, pass rate, top 5, subject averages.
        
        # Simplification: pass rate where marks_obtained >= paper__pass_mark
        passed_results = 0
        for res in results_qs:
            if res.marks_obtained and res.paper.pass_mark and res.marks_obtained >= res.paper.pass_mark:
                passed_results += 1
        
        pass_rate = (passed_results / total_results * 100) if total_results > 0 else 0
        
        top_5 = ExamResultSerializer(results_qs.order_by('-marks_obtained')[:5], many=True).data
        
        subject_averages = results_qs.values('paper__subject__name').annotate(avg=Avg('marks_obtained'))
        
        return Response({
            "class_average": class_avg,
            "pass_rate_percent": pass_rate,
            "top_5_students": top_5,
            "subject_averages": subject_averages
        }, status=status.HTTP_200_OK)
