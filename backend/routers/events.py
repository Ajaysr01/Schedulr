from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import EventType
from schemas import EventTypeCreate, EventTypeOut, EventTypeUpdate, BulkAssignSchedule
from typing import List

router = APIRouter()


@router.get("/", response_model=List[EventTypeOut])
def list_event_types(db: Session = Depends(get_db)):
    return db.query(EventType).filter(EventType.is_active == True).all()


@router.get("/all", response_model=List[EventTypeOut])
def list_all_event_types(db: Session = Depends(get_db)):
    return db.query(EventType).all()


@router.get("/{slug}", response_model=EventTypeOut)
def get_event_type(slug: str, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.slug == slug, EventType.is_active == True).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    return et


@router.post("/", response_model=EventTypeOut)
def create_event_type(data: EventTypeCreate, db: Session = Depends(get_db)):
    existing = db.query(EventType).filter(EventType.slug == data.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    et = EventType(**data.model_dump())
    db.add(et)
    db.commit()
    db.refresh(et)
    return et


@router.put("/bulk-assign-schedule", response_model=dict)
def bulk_assign_schedule(data: BulkAssignSchedule, db: Session = Depends(get_db)):
    db.query(EventType).filter(EventType.id.in_(data.event_ids)).update(
        {EventType.schedule_id: data.schedule_id}, synchronize_session=False
    )
    db.commit()
    return {"message": "Schedules updated successfully"}

@router.put("/{event_id}", response_model=EventTypeOut)
def update_event_type(event_id: int, data: EventTypeUpdate, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.id == event_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")

    update_data = data.model_dump(exclude_unset=True)

    # Auto-generate slug from name if name changed but slug wasn't explicitly set
    if "name" in update_data and "slug" not in update_data:
        import re
        slug = update_data["name"].lower().strip()
        slug = re.sub(r"[^a-z0-9\s-]", "", slug)
        slug = re.sub(r"\s+", "-", slug)
        slug = re.sub(r"-+", "-", slug).strip("-")
        update_data["slug"] = slug

    # Validate slug uniqueness if slug is being changed
    if "slug" in update_data and update_data["slug"] != et.slug:
        conflict = db.query(EventType).filter(
            EventType.slug == update_data["slug"],
            EventType.id != event_id
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Slug already exists")

    for key, value in update_data.items():
        setattr(et, key, value)
    db.commit()
    db.refresh(et)
    return et


@router.delete("/{event_id}")
def delete_event_type(event_id: int, db: Session = Depends(get_db)):
    et = db.query(EventType).filter(EventType.id == event_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    
    import uuid
    et.is_active = False
    et.slug = f"{et.slug}-deleted-{uuid.uuid4().hex[:8]}"
    db.commit()
    return {"message": "Event type deleted"}

