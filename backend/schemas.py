from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from models import MeetingStatus


# ── Event Types ──────────────────────────────────────────────────────────────

class EventTypeBase(BaseModel):
    name: str
    slug: str
    duration: int
    description: Optional[str] = None
    color: str = "#0069ff"
    location: Optional[str] = None
    buffer_before: int = 0
    buffer_after: int = 0
    schedule_id: Optional[int] = None

class EventTypeCreate(EventTypeBase):
    pass

class EventTypeUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    duration: Optional[int] = None
    description: Optional[str] = None
    color: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None
    buffer_before: Optional[int] = None
    buffer_after: Optional[int] = None
    schedule_id: Optional[int] = None

class EventTypeOut(EventTypeBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class BulkAssignSchedule(BaseModel):
    event_ids: List[int]
    schedule_id: int


# ── Availability ─────────────────────────────────────────────────────────────

class AvailabilitySlotBase(BaseModel):
    day_of_week: int  # 0=Monday
    start_time: str   # "HH:MM"
    end_time: str
    is_active: bool = True

class AvailabilitySlotOut(AvailabilitySlotBase):
    id: int
    class Config:
        from_attributes = True

class DateOverrideBase(BaseModel):
    date: str          # "YYYY-MM-DD"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_available: bool = True

class DateOverrideOut(DateOverrideBase):
    id: int
    class Config:
        from_attributes = True

class AvailabilityScheduleBase(BaseModel):
    name: str = "Working Hours"
    timezone: str = "America/New_York"

class AvailabilityScheduleCreate(AvailabilityScheduleBase):
    slots: List[AvailabilitySlotBase] = []

class AvailabilityScheduleOut(AvailabilityScheduleBase):
    id: int
    is_default: bool
    slots: List[AvailabilitySlotOut] = []
    date_overrides: List[DateOverrideOut] = []

    class Config:
        from_attributes = True

class AvailabilityUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    slots: Optional[List[AvailabilitySlotBase]] = None


# ── Bookings / Meetings ───────────────────────────────────────────────────────

class BookingCreate(BaseModel):
    event_type_id: int
    invitee_name: str
    invitee_email: str
    invitee_notes: Optional[str] = None
    start_time: datetime
    timezone: str = "America/New_York"

class MeetingOut(BaseModel):
    id: int
    event_type_id: int
    invitee_name: str
    invitee_email: str
    invitee_notes: Optional[str] = None
    start_time: datetime
    end_time: datetime
    timezone: str
    status: MeetingStatus
    cancellation_reason: Optional[str] = None
    location: Optional[str] = None
    confirmation_token: Optional[str] = None
    created_at: datetime
    event_type: EventTypeOut

    class Config:
        from_attributes = True

class CancelMeeting(BaseModel):
    reason: Optional[str] = None

class AvailableSlotsQuery(BaseModel):
    date: str  # "YYYY-MM-DD"
    timezone: str = "America/New_York"
