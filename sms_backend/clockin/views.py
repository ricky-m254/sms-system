import re
import socket
import time
import urllib.request
import concurrent.futures
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

# Ports associated with known biometric device brands.
# PRIMARY: Dahua ASI6214S — probed first on its default ports.
BIOMETRIC_PROBE_PORTS = [
    # ── PRIMARY: Dahua ASI6214S ───────────────────────────────
    (37777, 'Dahua ASI6214S',         'Fingerprint / RFID'),  # Dahua SDK (primary)
    (37778, 'Dahua ASI6214S (RTSP)',  'Fingerprint / RFID'),  # Dahua stream port
    (80,    'Dahua ASI6214S (Web)',   'Web / HTTP'),           # Dahua web interface
    # ── Other Dahua access control series ─────────────────────
    (8000,  'Dahua (alt port)',       'Fingerprint / RFID'),
    # ── ZKTeco series ────────────────────────────────────────
    (4370,  'ZKTeco',                'Fingerprint / RFID'),   # ZKPCP protocol
    (5005,  'ZKTeco (alt port)',     'Fingerprint / RFID'),
    # ── Anviz series ─────────────────────────────────────────
    (5010,  'Anviz',                 'Fingerprint / RFID'),
    (6000,  'Anviz (alt port)',      'Fingerprint / RFID'),
    # ── FingerTec ────────────────────────────────────────────
    (4008,  'FingerTec',             'Fingerprint'),
    # ── Suprema ──────────────────────────────────────────────
    (9922,  'Suprema BioStar',       'Fingerprint'),
    # ── Generic HTTP terminals ────────────────────────────────
    (8080,  'HTTP Biometric Terminal', 'Web-based'),
]

def _tcp_probe(ip: str, port: int, timeout: float) -> bool:
    try:
        with socket.create_connection((ip, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


# ── Dahua SADP (Smart Adaptive Discovery Protocol) ────────────────────────────
# Standard 32-byte SADP v2 broadcast discovery packet
_DAHUA_SADP_PACKET = b'\x42\x44\x00\x05\x00\x20' + b'\x00' * 26


def _dahua_sadp_discover(sadp_timeout: float = 3.0) -> list:
    """
    Broadcast the Dahua SADP discovery packet to UDP port 37020.
    Devices on the LAN (ASI6214S, IPC, NVR, etc.) reply with XML
    containing their model, serial and IP — no target IP needed.
    """
    results = []
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.settimeout(sadp_timeout)
        sock.bind(('', 0))
        sock.sendto(_DAHUA_SADP_PACKET, ('255.255.255.255', 37020))
        deadline = time.monotonic() + sadp_timeout
        while time.monotonic() < deadline:
            try:
                data, addr = sock.recvfrom(8192)
                text = data.decode('utf-8', errors='ignore')
                model  = _xml_field(text, 'DeviceModel') or _xml_field(text, 'DeviceType') or 'Dahua Device'
                serial = _xml_field(text, 'SN') or ''
                mac    = _xml_field(text, 'MACAddress') or ''
                results.append({'ip': addr[0], 'model': model, 'serial': serial, 'mac': mac})
            except socket.timeout:
                break
    except Exception:
        pass
    finally:
        try:
            sock.close()
        except Exception:
            pass
    return results


def _xml_field(text: str, tag: str) -> str:
    """Extract the first <Tag>value</Tag> from an XML string."""
    m = re.search(rf'<{tag}>(.*?)</{tag}>', text, re.DOTALL)
    return m.group(1).strip() if m else ''


def _dahua_http_identify(ip: str, timeout: float = 1.5) -> dict:
    """
    Query the Dahua CGI API on port 80 to get device type and model.
    Works without authentication on most Dahua access control devices.
    Returns a dict with 'model' and/or 'type' when successful.
    """
    info: dict = {}
    for action, key in [
        ('getDeviceType',                        'type'),
        ('getProductDefinition&name=ProductModel', 'model'),
    ]:
        try:
            url = f'http://{ip}/cgi-bin/magicBox.cgi?action={action}'
            req = urllib.request.Request(url, headers={'User-Agent': 'SmartCampus/1.0'})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read().decode('utf-8', errors='ignore')
                m = re.search(r'(?:type|value)=(.+)', body)
                if m:
                    info[key] = m.group(1).strip()
        except Exception:
            pass
    return info

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


class DeviceDiscoverView(APIView):
    """
    POST /clockin/devices/discover/
    Body: { "ip_prefix": "192.168.1", "timeout": 0.5, "sadp_timeout": 3 }

    Phase 1 — Dahua SADP broadcast (UDP 37020):
        Sends a single broadcast; all Dahua devices on the LAN reply with
        their exact model, serial number and MAC address.  No target IP needed.

    Phase 2 — TCP port scan across ip_prefix.1–254:
        Probes every IP for known biometric device ports.
        For Dahua TCP hits on port 80 also queries the Dahua CGI HTTP API
        to confirm the model name (works without credentials).

    Results are merged, de-duplicated by IP and returned together.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "CLOCKIN"

    def post(self, request):
        ip_prefix    = (request.data.get('ip_prefix') or '').strip()
        timeout      = min(max(float(request.data.get('timeout',      0.5)), 0.1), 3.0)
        sadp_timeout = min(max(float(request.data.get('sadp_timeout', 3.0)), 1.0), 10.0)

        parts = ip_prefix.split('.')
        # Auto-strip: if user pasted a full IP like "192.168.1.108", take first 3 octets
        if len(parts) == 4 and all(p.isdigit() and 0 <= int(p) <= 255 for p in parts):
            parts = parts[:3]
            ip_prefix = '.'.join(parts)
        if len(parts) != 3 or not all(p.isdigit() and 0 <= int(p) <= 255 for p in parts):
            return Response(
                {'detail': 'ip_prefix must be like "192.168.1" (first 3 octets). You can also paste a full IP like "192.168.1.108" and the last octet will be stripped automatically.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Phase 1: Dahua SADP broadcast ──────────────────────────────────
        sadp_hits  = _dahua_sadp_discover(sadp_timeout=sadp_timeout)
        # Build a lookup  ip → sadp info  for later merge
        sadp_by_ip = {h['ip']: h for h in sadp_hits}

        found: list = []
        seen_ids: set = set()

        def _already_registered(ip: str, port: int) -> bool:
            dev_id = f"{ip}:{port}"
            return BiometricDevice.objects.filter(
                Q(device_id=dev_id) | Q(device_id=ip) | Q(notes__icontains=ip)
            ).exists()

        # Add SADP results first (highest confidence — real device identification)
        for h in sadp_hits:
            ip     = h['ip']
            dev_id = f"{ip}:37777"
            if dev_id in seen_ids:
                continue
            seen_ids.add(dev_id)
            found.append({
                'ip':                ip,
                'port':              37777,
                'brand':             f"Dahua {h['model']}",
                'model':             h['model'],
                'serial':            h['serial'],
                'mac':               h['mac'],
                'technology':        'Fingerprint / RFID',
                'device_id':         dev_id,
                'discovery_method':  'SADP Ethernet Broadcast',
                'already_registered': _already_registered(ip, 37777),
            })

        # ── Phase 2: TCP port scan + optional HTTP identification ──────────
        def probe_host(last_octet: int) -> list:
            ip   = f"{ip_prefix}.{last_octet}"
            hits = []
            for port, brand, tech in BIOMETRIC_PROBE_PORTS:
                if not _tcp_probe(ip, port, timeout):
                    continue
                dev_id = f"{ip}:{port}"
                if dev_id in seen_ids:
                    continue          # already captured via SADP

                model  = ''
                serial = ''
                method = 'TCP Port Probe'

                # Attempt HTTP identification for Dahua on port 80
                if port == 80:
                    http_info = _dahua_http_identify(ip, timeout=min(timeout * 2, 2.0))
                    if http_info:
                        model  = http_info.get('model', '')
                        method = 'TCP + HTTP Identified'
                        brand  = f"Dahua {model}" if model else brand

                # If SADP also saw this IP, pull the richer info
                if ip in sadp_by_ip:
                    sadp = sadp_by_ip[ip]
                    model  = model  or sadp['model']
                    serial = serial or sadp['serial']
                    method = 'SADP + TCP confirmed'

                hits.append({
                    'ip':                ip,
                    'port':              port,
                    'brand':             brand,
                    'model':             model,
                    'serial':            serial,
                    'mac':               '',
                    'technology':        tech,
                    'device_id':         dev_id,
                    'discovery_method':  method,
                    'already_registered': _already_registered(ip, port),
                })
            return hits

        with concurrent.futures.ThreadPoolExecutor(max_workers=128) as pool:
            futures = {pool.submit(probe_host, i): i for i in range(1, 255)}
            for future in concurrent.futures.as_completed(futures, timeout=60):
                try:
                    batch = future.result()
                    for item in batch:
                        if item['device_id'] not in seen_ids:
                            seen_ids.add(item['device_id'])
                            found.append(item)
                except Exception:
                    pass

        found.sort(key=lambda d: (list(map(int, d['ip'].split('.'))), d['port']))
        return Response({
            'devices':       found,
            'scanned':       f"{ip_prefix}.1 – {ip_prefix}.254",
            'sadp_found':    len(sadp_hits),
            'ports_checked': [p for p, _, _ in BIOMETRIC_PROBE_PORTS],
        })
