from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from school.permissions import HasModuleAccess
from .models import Vehicle, Route, RouteStop, StudentTransport, TransportIncident
from .serializers import (
    VehicleSerializer, RouteSerializer, RouteStopSerializer,
    StudentTransportSerializer, TransportIncidentSerializer
)

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "TRANSPORT"
    filterset_fields = ['status']

class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.all()
    serializer_class = RouteSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "TRANSPORT"
    filterset_fields = ['vehicle', 'is_active']

class RouteStopViewSet(viewsets.ModelViewSet):
    queryset = RouteStop.objects.all()
    serializer_class = RouteStopSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "TRANSPORT"
    filterset_fields = ['route']

class StudentTransportViewSet(viewsets.ModelViewSet):
    queryset = StudentTransport.objects.all()
    serializer_class = StudentTransportSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "TRANSPORT"
    filterset_fields = ['route', 'is_active', 'term']

class TransportIncidentViewSet(viewsets.ModelViewSet):
    queryset = TransportIncident.objects.all()
    serializer_class = TransportIncidentSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "TRANSPORT"
    filterset_fields = ['vehicle', 'resolved']

class TransportDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "TRANSPORT"

    def get(self, request):
        return Response({
            "total_vehicles": Vehicle.objects.count(),
            "active_routes": Route.objects.filter(is_active=True).count(),
            "students_enrolled": StudentTransport.objects.filter(is_active=True).count(),
            "incidents_open": TransportIncident.objects.filter(resolved=False).count(),
        })
