from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import AvailabilitySchedule, AvailabilitySlot, DateOverride
from schemas import (AvailabilityScheduleOut, AvailabilityUpdate,
                     AvailabilityScheduleCreate, DateOverrideBase, DateOverrideOut)
from typing import List

router = APIRouter()

@router.get("/all", response_model=List[AvailabilityScheduleOut])
def get_all_schedules(db: Session = Depends(get_db)):
    return db.query(AvailabilitySchedule).all()


@router.get("/", response_model=AvailabilityScheduleOut)
def get_default_schedule(db: Session = Depends(get_db)):
    schedule = db.query(AvailabilitySchedule).filter(
        AvailabilitySchedule.is_default == True
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="No schedule found")
    return schedule


@router.post("/", response_model=AvailabilityScheduleOut)
def create_schedule(data: AvailabilityScheduleCreate, db: Session = Depends(get_db)):
    schedule = AvailabilitySchedule(
        name=data.name,
        timezone=data.timezone,
        is_default=False
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    
    if data.slots:
        for slot_data in data.slots:
            slot = AvailabilitySlot(schedule_id=schedule.id, **slot_data.model_dump())
            db.add(slot)
        db.commit()
        db.refresh(schedule)
        
    return schedule

@router.put("/{schedule_id}", response_model=AvailabilityScheduleOut)
def update_schedule(schedule_id: int, data: AvailabilityUpdate, db: Session = Depends(get_db)):
    schedule = db.query(AvailabilitySchedule).filter(AvailabilitySchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    if data.name:
        schedule.name = data.name
    if data.timezone:
        schedule.timezone = data.timezone

    if data.slots is not None:
        db.query(AvailabilitySlot).filter(
            AvailabilitySlot.schedule_id == schedule.id
        ).delete()
        for slot_data in data.slots:
            slot = AvailabilitySlot(schedule_id=schedule.id, **slot_data.model_dump())
            db.add(slot)

    db.commit()
    db.refresh(schedule)
    return schedule

@router.put("/{schedule_id}/default", response_model=AvailabilityScheduleOut)
def set_default_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(AvailabilitySchedule).filter(AvailabilitySchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Unset existing defaults safely (prevents MySQL safe update mode errors)
    old_defaults = db.query(AvailabilitySchedule).filter(AvailabilitySchedule.is_default == True).all()
    for old in old_defaults:
        old.is_default = False
        
    schedule.is_default = True
    db.commit()
    db.refresh(schedule)
    return schedule

@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(AvailabilitySchedule).filter(AvailabilitySchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if schedule.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete the default schedule")
        
    db.delete(schedule)
    db.commit()
    return {"message": "Schedule deleted"}


@router.post("/overrides", response_model=DateOverrideOut)
def add_date_override(data: DateOverrideBase, db: Session = Depends(get_db)):
    schedule = db.query(AvailabilitySchedule).filter(
        AvailabilitySchedule.is_default == True
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="No schedule found")

    # Remove existing override for same date
    db.query(DateOverride).filter(
        DateOverride.schedule_id == schedule.id,
        DateOverride.date == data.date
    ).delete()

    override = DateOverride(schedule_id=schedule.id, **data.model_dump())
    db.add(override)
    db.commit()
    db.refresh(override)
    return override


@router.delete("/overrides/{override_id}")
def delete_date_override(override_id: int, db: Session = Depends(get_db)):
    override = db.query(DateOverride).filter(DateOverride.id == override_id).first()
    if not override:
        raise HTTPException(status_code=404, detail="Override not found")
    db.delete(override)
    db.commit()
    return {"message": "Override deleted"}
