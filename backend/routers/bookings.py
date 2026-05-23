from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Meeting, EventType, AvailabilitySchedule, MeetingStatus, DateOverride
from schemas import BookingCreate, MeetingOut
from datetime import datetime, date, timedelta
import secrets
import pytz
from typing import List

router = APIRouter()


def get_available_slots(
    event_type: EventType,
    target_date: date,
    schedule: AvailabilitySchedule,
    db: Session,
    tz_name: str = "America/New_York"
) -> List[str]:
    """Return list of available start times 'HH:MM' for given date in invitee's timezone."""
    try:
        invitee_tz = pytz.timezone(tz_name)
    except Exception:
        invitee_tz = pytz.utc

    try:
        schedule_tz = pytz.timezone(schedule.timezone)
    except Exception:
        schedule_tz = pytz.utc

    # The target_date is in the invitee's timezone.
    # Determine which schedule-timezone days overlap this invitee day.
    inv_day_start = invitee_tz.localize(
        datetime(target_date.year, target_date.month, target_date.day, 0, 0)
    )
    inv_day_end = invitee_tz.localize(
        datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59)
    )

    sched_day_start = inv_day_start.astimezone(schedule_tz)
    sched_day_end = inv_day_end.astimezone(schedule_tz)

    # Collect all availability windows as UTC ranges
    availability_windows = []
    current_day = sched_day_start.date()
    end_day = sched_day_end.date()
    while current_day <= end_day:
        day_of_week = current_day.weekday()
        date_str = current_day.strftime("%Y-%m-%d")

        override = next(
            (o for o in schedule.date_overrides if o.date == date_str), None
        )

        if override:
            if not override.is_available or not override.start_time or not override.end_time:
                current_day += timedelta(days=1)
                continue
            ds, de = override.start_time, override.end_time
        else:
            slot = next(
                (s for s in schedule.slots if s.day_of_week == day_of_week and s.is_active),
                None,
            )
            if not slot:
                current_day += timedelta(days=1)
                continue
            ds, de = slot.start_time, slot.end_time

        sh, sm = map(int, ds.split(":"))
        eh, em = map(int, de.split(":"))

        window_start = schedule_tz.localize(
            datetime(current_day.year, current_day.month, current_day.day, sh, sm)
        )
        window_end = schedule_tz.localize(
            datetime(current_day.year, current_day.month, current_day.day, eh, em)
        )
        availability_windows.append(
            (window_start.astimezone(pytz.utc), window_end.astimezone(pytz.utc))
        )
        current_day += timedelta(days=1)

    if not availability_windows:
        return []

    # Query existing meetings covering the full UTC range
    query_start_utc = min(w[0] for w in availability_windows).replace(tzinfo=None)
    query_end_utc = max(w[1] for w in availability_windows).replace(tzinfo=None)

    existing = db.query(Meeting).options(
        joinedload(Meeting.event_type)
    ).filter(
        Meeting.status == MeetingStatus.scheduled,
        Meeting.start_time >= query_start_utc,
        Meeting.start_time <= query_end_utc
    ).all()

    booked_ranges_utc = []
    for m in existing:
        m_start = pytz.utc.localize(m.start_time)
        m_end = pytz.utc.localize(m.end_time)
        m_buf_before = m.event_type.buffer_before if m.event_type else 0
        m_buf_after = m.event_type.buffer_after if m.event_type else 0
        booked_ranges_utc.append((
            m_start - timedelta(minutes=m_buf_before),
            m_end + timedelta(minutes=m_buf_after),
        ))

    duration_total = event_type.duration + event_type.buffer_before + event_type.buffer_after
    now_utc = pytz.utc.localize(datetime.utcnow())

    slots = []
    for ws_utc, we_utc in availability_windows:
        cursor = ws_utc
        while cursor + timedelta(minutes=duration_total) <= we_utc:
            slot_end = cursor + timedelta(minutes=duration_total)

            # Skip past slots (30-min buffer from now)
            if cursor <= now_utc + timedelta(minutes=30):
                cursor += timedelta(minutes=30)
                continue

            # Check conflict with booked meetings
            conflict = any(
                not (slot_end <= b_start or cursor >= b_end)
                for b_start, b_end in booked_ranges_utc
            )

            if not conflict:
                # The invitee-visible start is after buffer_before
                actual_start = cursor + timedelta(minutes=event_type.buffer_before)
                local_start = actual_start.astimezone(invitee_tz)
                # Only include if the slot falls on the requested target_date
                if local_start.date() == target_date:
                    slots.append(f"{local_start.hour:02d}:{local_start.minute:02d}")

            cursor += timedelta(minutes=30)

    return slots


@router.get("/slots")
def get_slots(
    event_slug: str = Query(...),
    date: str = Query(...),
    timezone: str = Query("America/New_York"),
    db: Session = Depends(get_db)
):
    """Get available slots for an event type on a specific date."""
    et = db.query(EventType).filter(
        EventType.slug == event_slug,
        EventType.is_active == True
    ).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")

    if et.schedule_id:
        schedule = db.query(AvailabilitySchedule).options(
            joinedload(AvailabilitySchedule.slots),
            joinedload(AvailabilitySchedule.date_overrides)
        ).filter(
            AvailabilitySchedule.id == et.schedule_id
        ).first()
    else:
        schedule = db.query(AvailabilitySchedule).options(
            joinedload(AvailabilitySchedule.slots),
            joinedload(AvailabilitySchedule.date_overrides)
        ).filter(
            AvailabilitySchedule.is_default == True
        ).first()
    if not schedule:
        return {"slots": []}

    try:
        target = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    slots = get_available_slots(et, target, schedule, db, timezone)
    return {"slots": slots, "date": date, "timezone": timezone}


@router.post("/", response_model=MeetingOut)
def create_booking(data: BookingCreate, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(
        EventType.id == data.event_type_id,
        EventType.is_active == True
    ).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")

    try:
        tz = pytz.timezone(data.timezone)
    except Exception:
        tz = pytz.utc
        
    if data.start_time.tzinfo is None:
        local_dt = tz.localize(data.start_time)
        start_time_utc = local_dt.astimezone(pytz.utc).replace(tzinfo=None)
    else:
        start_time_utc = data.start_time.astimezone(pytz.utc).replace(tzinfo=None)

    # Check for double booking
    end_time = start_time_utc + timedelta(minutes=et.duration)

    conflict = db.query(Meeting).filter(
        Meeting.status == MeetingStatus.scheduled,
        Meeting.start_time < end_time,
        Meeting.end_time > start_time_utc
    ).first()

    if conflict:
        raise HTTPException(status_code=409, detail="This time slot is already booked")

    token = secrets.token_urlsafe(32)

    meeting = Meeting(
        event_type_id=et.id,
        invitee_name=data.invitee_name,
        invitee_email=data.invitee_email,
        invitee_notes=data.invitee_notes,
        start_time=start_time_utc,
        end_time=end_time,
        timezone=data.timezone,
        location=et.location,
        confirmation_token=token,
        status=MeetingStatus.scheduled
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting
