from database import SessionLocal
from models import EventType, AvailabilitySchedule, AvailabilitySlot, Meeting, MeetingStatus
from datetime import datetime, timedelta
import secrets


def seed_database():
    db = SessionLocal()
    try:
        # Skip if already seeded
        if db.query(EventType).count() > 0:
            return

        # Event Types
        events = [
            EventType(
                name="15 Minute Meeting",
                slug="15min",
                duration=15,
                description="A quick 15-minute chat",
                color="#0069ff",
                location="Zoom",
            ),
            EventType(
                name="30 Minute Meeting",
                slug="30min",
                duration=30,
                description="A standard 30-minute meeting",
                color="#00a2ff",
                location="Google Meet",
            ),
            EventType(
                name="1 Hour Meeting",
                slug="60min",
                duration=60,
                description="An in-depth 60-minute session",
                color="#7c3aed",
                location="Zoom",
            ),
            EventType(
                name="Discovery Call",
                slug="discovery",
                duration=45,
                description="Let's discuss your needs and how I can help",
                color="#059669",
                location="Phone",
            ),
        ]
        db.add_all(events)
        db.flush()

        # Availability schedule (Mon-Fri 9-5)
        schedule = AvailabilitySchedule(
            name="Working Hours",
            timezone="America/New_York",
            is_default=True
        )
        db.add(schedule)
        db.flush()

        slots = []
        for day in range(5):  # Mon-Fri
            slots.append(AvailabilitySlot(
                schedule_id=schedule.id,
                day_of_week=day,
                start_time="09:00",
                end_time="17:00",
                is_active=True
            ))
        db.add_all(slots)

        # Sample meetings
        now = datetime.utcnow()
        sample_meetings = [
            Meeting(
                event_type_id=events[1].id,
                invitee_name="Alice Johnson",
                invitee_email="alice@example.com",
                start_time=now + timedelta(days=1, hours=2),
                end_time=now + timedelta(days=1, hours=2, minutes=30),
                timezone="America/New_York",
                status=MeetingStatus.scheduled,
                location="Google Meet",
                confirmation_token=secrets.token_urlsafe(32),
            ),
            Meeting(
                event_type_id=events[2].id,
                invitee_name="Bob Smith",
                invitee_email="bob@example.com",
                start_time=now + timedelta(days=2, hours=4),
                end_time=now + timedelta(days=2, hours=5),
                timezone="America/New_York",
                status=MeetingStatus.scheduled,
                location="Zoom",
                confirmation_token=secrets.token_urlsafe(32),
            ),
            Meeting(
                event_type_id=events[3].id,
                invitee_name="Carol White",
                invitee_email="carol@example.com",
                start_time=now - timedelta(days=3, hours=1),
                end_time=now - timedelta(days=3),
                timezone="America/New_York",
                status=MeetingStatus.completed,
                location="Phone",
                confirmation_token=secrets.token_urlsafe(32),
            ),
            Meeting(
                event_type_id=events[0].id,
                invitee_name="David Lee",
                invitee_email="david@example.com",
                start_time=now - timedelta(days=7, hours=2),
                end_time=now - timedelta(days=7, hours=1, minutes=45),
                timezone="America/New_York",
                status=MeetingStatus.cancelled,
                cancellation_reason="Schedule conflict",
                confirmation_token=secrets.token_urlsafe(32),
            ),
        ]
        db.add_all(sample_meetings)
        db.commit()
        print("✅ Database seeded successfully")

    except Exception as e:
        print(f"Seed error: {e}")
        db.rollback()
    finally:
        db.close()
