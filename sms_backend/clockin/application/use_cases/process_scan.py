"""
ProcessScanUseCase
==================
Application layer use case extracted from views.py _process_scan_event.

Orchestrates:
  1. Person lookup (via PersonRepository)
  2. Direction determination (domain rule)
  3. Late detection (domain rule)
  4. ClockEvent persistence (via ClockEventRepository)
  5. Attendance record update (via AttendanceService — cross-domain DTO)
  6. Admin notification (via NotificationService)

No direct ORM access. No Django imports at the top level.
"""
from datetime import datetime
from typing import Optional

from clockin.domain.rules.attendance import determine_event_type, is_late_arrival, minutes_late
from clockin.domain.entities.clock_event import ClockEventEntity


class ProcessScanUseCase:
    """
    Single responsibility: turn a raw biometric scan into a persisted ClockEvent.

    Dependencies are injected (DI) so each can be swapped / mocked in tests.
    """

    def __init__(
        self,
        person_repo,          # AbstractPersonRepository
        clock_event_repo,     # AbstractClockEventRepository
        shift_repo,           # AbstractShiftRepository
        attendance_service,   # AttendanceService (cross-domain writer)
        notification_service, # NotificationService
    ):
        self.person_repo          = person_repo
        self.clock_event_repo     = clock_event_repo
        self.shift_repo           = shift_repo
        self.attendance_service   = attendance_service
        self.notification_service = notification_service

    def execute(
        self,
        person_id: int,
        device_id: Optional[int],
        event_timestamp: datetime,
        direction: str = 'auto',
    ) -> dict:
        """
        Execute the scan processing pipeline.
        Returns a result dict consumable by the presentation layer.
        """
        from common.exceptions import PersonNotFoundError

        # 1. Load person
        person = self.person_repo.find_by_id(person_id)
        if not person:
            raise PersonNotFoundError(f"No active person with id={person_id}")

        event_date = event_timestamp.date()

        # 2. Determine IN/OUT
        last_event = self.clock_event_repo.find_last_for_person_on_date(person.id, event_date)
        last_type  = last_event.event_type if last_event else None
        event_type = determine_event_type(direction, last_type)

        # 3. Late detection (only for IN)
        late = False
        late_mins = 0
        if event_type == 'IN':
            shift = self.shift_repo.find_active_shift_for_person_type(person.person_type)
            if shift:
                late = is_late_arrival(event_timestamp, shift['expected_arrival'], shift['grace_period_minutes'])
                if late:
                    late_mins = minutes_late(event_timestamp, shift['expected_arrival'], shift['grace_period_minutes'])

        # 4. Dedup check
        if self.clock_event_repo.duplicate_exists(person.id, event_type, event_timestamp):
            return {'status': 'duplicate', 'person': person.display_name, 'event_type': event_type}

        # 5. Persist ClockEvent
        entity = ClockEventEntity(
            person_id=person.id,
            event_type=event_type,
            timestamp=event_timestamp,
            event_date=event_date,
            is_late=late,
            device_id=device_id,
        )
        entity.validate()
        saved = self.clock_event_repo.save(entity)

        # 6. Update attendance records (cross-domain write via service — no direct ORM)
        self.attendance_service.update(person, event_type, event_timestamp, event_date, late)

        # 7. Notify admins if late
        if late:
            self.notification_service.notify_late_arrival(
                person=person,
                event_time=event_timestamp,
                minutes_late=late_mins,
            )

        return {
            'status':     'ok',
            'event_type': event_type,
            'is_late':    late,
            'person':     person.display_name,
            'event_id':   saved,
        }

    def execute_from_person_obj(self, person_obj, device_obj, event_timestamp, direction='auto'):
        """
        Backward-compatible entry point called from legacy views.py functions.
        Wraps the Django model objects into a thin adapter so views.py
        does not need to be rewritten immediately.
        """
        from clockin.infrastructure.repositories.person_repository import PersonEntityAdapter
        from clockin.infrastructure.repositories.clock_event_repository import DjangoClockEventRepository
        from clockin.infrastructure.repositories.shift_repository import DjangoShiftRepository
        from clockin.infrastructure.services.attendance_service import DjangoAttendanceService
        from clockin.infrastructure.services.notification_service import DjangoNotificationService

        person_entity = PersonEntityAdapter.from_model(person_obj)
        event_date = event_timestamp.date()

        # Determine IN/OUT using domain rule
        last_event = DjangoClockEventRepository().find_last_for_person_on_date(person_obj.pk, event_date)
        last_type  = last_event.event_type if last_event else None
        event_type = determine_event_type(direction, last_type)

        # Late detection
        late = False
        late_mins = 0
        if event_type == 'IN':
            shift_data = DjangoShiftRepository().find_active_shift_for_person_type(person_obj.person_type)
            if shift_data:
                late = is_late_arrival(event_timestamp, shift_data['expected_arrival'], shift_data['grace_period_minutes'])
                if late:
                    late_mins = minutes_late(event_timestamp, shift_data['expected_arrival'], shift_data['grace_period_minutes'])

        # Dedup
        if DjangoClockEventRepository().duplicate_exists(person_obj.pk, event_type, event_timestamp):
            return None   # caller decides what to do

        # Persist
        entity = ClockEventEntity(
            person_id=person_obj.pk,
            event_type=event_type,
            timestamp=event_timestamp,
            event_date=event_date,
            is_late=late,
            device_id=device_obj.pk if device_obj else None,
        )
        event_orm = DjangoClockEventRepository().save(entity)

        # Cross-domain write
        DjangoAttendanceService().update(person_entity, event_type, event_timestamp, event_date, late)

        # Notifications
        if late:
            DjangoNotificationService().notify_late_arrival(
                person=person_entity,
                event_time=event_timestamp,
                minutes_late=late_mins,
            )

        return event_orm
