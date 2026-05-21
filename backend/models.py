from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class MeetingStatus(str, enum.Enum):
    scheduled = "scheduled"
    cancelled = "cancelled"
    completed = "completed"


class EventType(Base):
    __tablename__ = "event_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    duration = Column(Integer, nullable=False)  # minutes
    description = Column(Text, nullable=True)
    color = Column(String(7), default="#0069ff")
    location = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    buffer_before = Column(Integer, default=0)  # minutes
    buffer_after = Column(Integer, default=0)   # minutes
    schedule_id = Column(Integer, ForeignKey("availability_schedules.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    schedule = relationship("AvailabilitySchedule")
    meetings = relationship("Meeting", back_populates="event_type")


class AvailabilitySchedule(Base):
    __tablename__ = "availability_schedules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), default="Working Hours")
    timezone = Column(String(100), default="America/New_York")
    is_default = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    slots = relationship("AvailabilitySlot", back_populates="schedule", cascade="all, delete-orphan")
    date_overrides = relationship("DateOverride", back_populates="schedule", cascade="all, delete-orphan")


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("availability_schedules.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(String(5), nullable=False)  # "HH:MM"
    end_time = Column(String(5), nullable=False)    # "HH:MM"
    is_active = Column(Boolean, default=True)

    schedule = relationship("AvailabilitySchedule", back_populates="slots")


class DateOverride(Base):
    __tablename__ = "date_overrides"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("availability_schedules.id"), nullable=False)
    date = Column(String(10), nullable=False)  # "YYYY-MM-DD"
    start_time = Column(String(5), nullable=True)  # null = unavailable all day
    end_time = Column(String(5), nullable=True)
    is_available = Column(Boolean, default=True)

    schedule = relationship("AvailabilitySchedule", back_populates="date_overrides")


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    event_type_id = Column(Integer, ForeignKey("event_types.id"), nullable=False)
    invitee_name = Column(String(255), nullable=False)
    invitee_email = Column(String(255), nullable=False)
    invitee_notes = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    timezone = Column(String(100), default="America/New_York")
    status = Column(Enum(MeetingStatus), default=MeetingStatus.scheduled)
    cancellation_reason = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    confirmation_token = Column(String(64), unique=True, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    event_type = relationship("EventType", back_populates="meetings")
