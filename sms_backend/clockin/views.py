from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import date, datetime, timedelta
from .models import BiometricDevice, SchoolShift, PersonRegistry, ClockEvent
from .serializers import (
    BiometricDeviceSerializer, 
    SchoolShiftSerializer, 
    PersonRegistrySerializer, 
    ClockEventSerializer
)
from school.permissions import HasModuleAccess
from school.models import AttendanceRecord as StudentAttendanceRecord, UserProfile
from hr.models import AttendanceRecord as EmployeeAttendanceRecord
from communication.models import Notification
from django.db.models import Q

def _notify_admins(title, message, priority='Important', action_url=''):
    admin_users = UserProfile.objects.filter(
        role__name__in=['ADMIN', 'TENANT_SUPER_ADMIN']
    ).select_related('user')
    for up in admin_users:
        Notification.objects.create(
            recipient=up.user,
            notification_type='HR',
            title=title,
            message=message,
            priority=priority,
            action_url=action_url,
            delivery_status='Sent',
        )

class ClockInModuleMixin:
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "CLOCKIN"

class BiometricDeviceViewSet(ClockInModuleMixin, viewsets.ModelViewSet):
    queryset = BiometricDevice.objects.all()
    serializer_class = BiometricDeviceSerializer

class SchoolShiftViewSet(ClockInModuleMixin, viewsets.ModelViewSet):
    queryset = SchoolShift.objects.all()
    serializer_class = SchoolShiftSerializer

class PersonRegistryViewSet(ClockInModuleMixin, viewsets.ModelViewSet):
    queryset = PersonRegistry.objects.all()
    serializer_class = PersonRegistrySerializer

class ClockEventViewSet(ClockInModuleMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ClockEvent.objects.all()
    serializer_class = ClockEventSerializer
    filterset_fields = ['date', 'person__person_type']

class ScanView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        fingerprint_id = request.data.get('fingerprint_id')
        device_id = request.data.get('device_id')
        timestamp_str = request.data.get('timestamp')
        
        # 1. Device Auth (if device_id provided and not kiosk route)
        device = None
        if device_id:
            device = BiometricDevice.objects.filter(device_id=device_id, is_active=True).first()
            if not device:
                return Response({"error": "Device not found or inactive"}, status=status.HTTP_404_NOT_FOUND)
            
            # Simple X-Device-Key check if not kiosk
            if 'kiosk' not in request.path:
                api_key = request.headers.get('X-Device-Key')
                if api_key != device.api_key:
                    return Response({"error": "Invalid Device Key"}, status=status.HTTP_401_UNAUTHORIZED)
            
            device.last_seen = timezone.now()
            device.save(update_fields=['last_seen'])

        # 2. Lookup Person
        person = PersonRegistry.objects.filter(fingerprint_id=fingerprint_id, is_active=True).first()
        if not person:
            return Response({"error": "Person not found in registry"}, status=status.HTTP_404_NOT_FOUND)

        # 3. Handle Timestamp
        if timestamp_str:
            try:
                event_timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            except ValueError:
                event_timestamp = timezone.now()
        else:
            event_timestamp = timezone.now()

        event_date = event_timestamp.date()

        # 4. Determine Event Type (IN/OUT)
        last_event = ClockEvent.objects.filter(person=person, date=event_date).first()
        event_type = 'OUT' if last_event and last_event.event_type == 'IN' else 'IN'

        # 5. Determine Late Status
        is_late = False
        if event_type == 'IN':
            shift = SchoolShift.objects.filter(
                Q(person_type='ALL') | Q(person_type=person.person_type),
                is_active=True
            ).first()
            if shift:
                arrival_time = event_timestamp.time()
                expected = shift.expected_arrival
                grace = shift.grace_period_minutes
                # Compare arrival_time with (expected + grace)
                limit_dt = datetime.combine(event_date, expected) + timedelta(minutes=grace)
                if event_timestamp > timezone.make_aware(limit_dt) if timezone.is_aware(event_timestamp) else limit_dt:
                    is_late = True

        # 6. Create ClockEvent
        event = ClockEvent.objects.create(
            person=person,
            device=device,
            event_type=event_type,
            timestamp=event_timestamp,
            date=event_date,
            is_late=is_late
        )

        if is_late:
            minutes_late = 0
            shift = SchoolShift.objects.filter(
                Q(person_type='ALL') | Q(person_type=person.person_type),
                is_active=True
            ).first()
            if shift:
                arrival = datetime.combine(event_date, shift.expected_arrival)
                if timezone.is_aware(event_timestamp):
                    arrival = timezone.make_aware(arrival)
                minutes_late = max(0, int((event_timestamp - arrival).total_seconds() / 60) - shift.grace_period_minutes)
            
            event_time_str = event_timestamp.strftime("%H:%M")
            _notify_admins(
                title=f"Late Arrival: {person.display_name}",
                message=f"{person.display_name} ({person.get_person_type_display()}) clocked in at {event_time_str} — {minutes_late} min(s) late.",
                priority='Important',
                action_url='/modules/clockin/dashboard',
            )

            # Timetable Integration: Auto-flag uncovered lessons for teachers
            if person.person_type == 'TEACHER' and person.employee and person.employee.user:
                try:
                    from timetable.models import TimetableSlot, LessonCoverage
                    today_weekday = event_date.isoweekday() # 1=Mon, 5=Fri
                    if 1 <= today_weekday <= 5:
                        current_time = event_timestamp.time()
                        # Slots that started before or at clock-in time
                        affected_slots = TimetableSlot.objects.filter(
                            day_of_week=today_weekday,
                            teacher=person.employee.user,
                            start_time__lte=current_time,
                            is_active=True
                        )
                        for slot in affected_slots:
                            LessonCoverage.objects.get_or_create(
                                slot=slot,
                                date=event_date,
                                defaults={
                                    'original_teacher': person.employee.user,
                                    'status': 'Uncovered',
                                    'auto_flagged': True,
                                    'notes': f'Auto-flagged due to late arrival at {event_time_str}'
                                }
                            )
                except Exception as te:
                    print(f"Timetable integration failed: {te}")

        # 7. Auto-update Attendance
        attendance_updated = False
        try:
            if person.person_type == 'STUDENT' and person.student:
                if event_type == 'IN':
                    status_val = 'Late' if is_late else 'Present'
                    StudentAttendanceRecord.objects.update_or_create(
                        student=person.student,
                        date=event_date,
                        defaults={'status': status_val, 'notes': f'Clock-in event at {event_timestamp.time()}'}
                    )
                    attendance_updated = True
            elif person.person_type in ['TEACHER', 'STAFF'] and person.employee:
                if event_type == 'IN':
                    status_val = 'Late' if is_late else 'Present'
                    EmployeeAttendanceRecord.objects.update_or_create(
                        employee=person.employee,
                        date=event_date,
                        defaults={
                            'clock_in': event_timestamp.time(),
                            'status': status_val,
                            'notes': f'Clock-in event'
                        }
                    )
                    attendance_updated = True
                elif event_type == 'OUT':
                    att_rec = EmployeeAttendanceRecord.objects.filter(employee=person.employee, date=event_date).first()
                    if att_rec:
                        att_rec.clock_out = event_timestamp.time()
                        # Calculate hours_worked
                        if att_rec.clock_in:
                            start_dt = datetime.combine(event_date, att_rec.clock_in)
                            end_dt = datetime.combine(event_date, att_rec.clock_out)
                            diff = (end_dt - start_dt).total_seconds() / 3600.0
                            att_rec.hours_worked = round(diff, 2)
                        att_rec.save()
                        attendance_updated = True
            
            if attendance_updated:
                event.attendance_updated = True
                event.save(update_fields=['attendance_updated'])

        except Exception as e:
            # Log error but don't fail the scan response
            print(f"Attendance update failed: {e}")

        # 8. Return Response
        return Response({
            "event_type": event_type,
            "is_late": is_late,
            "person": {
                "display_name": person.display_name,
                "person_type": person.person_type,
                "fingerprint_id": person.fingerprint_id,
                "admission_number_or_employee_id": person.student.admission_number if person.student else (person.employee.employee_id if person.employee else None)
            },
            "message": f"Successfully clocked {event_type.lower()}"
        }, status=status.HTTP_201_CREATED)

class DashboardView(ClockInModuleMixin, APIView):
    def get(self, request):
        today = date.today()
        # Stats
        students_in = ClockEvent.objects.filter(date=today, event_type='IN', person__person_type='STUDENT').count()
        students_late = ClockEvent.objects.filter(date=today, event_type='IN', person__person_type='STUDENT', is_late=True).count()
        staff_in = ClockEvent.objects.filter(date=today, event_type='IN', person__person_type__in=['TEACHER', 'STAFF']).count()
        staff_late = ClockEvent.objects.filter(date=today, event_type='IN', person__person_type__in=['TEACHER', 'STAFF'], is_late=True).count()
        
        recent_events = ClockEvent.objects.all()[:20]
        serializer = ClockEventSerializer(recent_events, many=True)
        
        return Response({
            "students_in": students_in,
            "students_late": students_late,
            "staff_in": staff_in,
            "staff_late": staff_late,
            "recent_events": serializer.data
        })

class RealtimeView(ClockInModuleMixin, APIView):
    def get(self, request):
        today = date.today()
        # Find all persons who have scanned today
        scanned_today = PersonRegistry.objects.filter(events__date=today).distinct()
        results = []
        for person in scanned_today:
            last_event = ClockEvent.objects.filter(person=person, date=today).order_by('-timestamp').first()
            if last_event and last_event.event_type == 'IN':
                results.append({
                    "name": person.display_name,
                    "role": person.person_type,
                    "person_type": person.person_type,
                    "time_in": last_event.timestamp
                })
        return Response(results)
