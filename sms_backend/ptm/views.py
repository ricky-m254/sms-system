from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from school.permissions import HasModuleAccess
from .models import PTMSession, PTMSlot, PTMBooking
from .serializers import (
    PTMSessionSerializer,
    PTMSlotSerializer,
    PTMBookingSerializer,
)

class PTMSessionViewSet(viewsets.ModelViewSet):
    queryset = PTMSession.objects.all().order_by('-date')
    serializer_class = PTMSessionSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "PTM"

class PTMSlotViewSet(viewsets.ModelViewSet):
    queryset = PTMSlot.objects.all()
    serializer_class = PTMSlotSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "PTM"
    filterset_fields = ['session', 'teacher', 'is_booked']

class PTMBookingViewSet(viewsets.ModelViewSet):
    queryset = PTMBooking.objects.all()
    serializer_class = PTMBookingSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "PTM"
    filterset_fields = ['slot', 'student', 'status']

class PTMDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "PTM"

    def get(self, request):
        from django.utils import timezone
        today = timezone.now().date()
        upcoming_sessions = PTMSession.objects.filter(date__gte=today).order_by('date')[:5]
        total_slots = PTMSlot.objects.filter(session__in=upcoming_sessions).count()
        booked_slots = PTMSlot.objects.filter(session__in=upcoming_sessions, is_booked=True).count()
        
        return Response({
            'upcoming_sessions': PTMSessionSerializer(upcoming_sessions, many=True).data,
            'total_slots': total_slots,
            'booked_slots': booked_slots,
            'available_slots': total_slots - booked_slots
        })

class MyPTMSlotsView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "PTM"

    def get(self, request):
        slots = PTMSlot.objects.filter(teacher=request.user)
        return Response(PTMSlotSerializer(slots, many=True).data)
