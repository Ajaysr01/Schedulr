from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Meeting, MeetingStatus
from schemas import MeetingOut, CancelMeeting
from datetime import datetime
from typing import List, Optional

router = APIRouter()


@router.get("/", response_model=List[MeetingOut])
def list_meetings(
    status: Optional[str] = Query(None),
    upcoming: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Meeting)
    now = datetime.utcnow()

    if upcoming is True:
        query = query.filter(
            Meeting.start_time >= now,
            Meeting.status == MeetingStatus.scheduled
        )
    elif upcoming is False:
        query = query.filter(
            (Meeting.start_time < now) | (Meeting.status != MeetingStatus.scheduled)
        )

    if status:
        query = query.filter(Meeting.status == status)

    return query.order_by(Meeting.start_time).all()


@router.get("/{meeting_id}", response_model=MeetingOut)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.get("/token/{token}", response_model=MeetingOut)
def get_meeting_by_token(token: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.confirmation_token == token).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.put("/{meeting_id}/cancel")
def cancel_meeting(meeting_id: int, data: CancelMeeting, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.status == MeetingStatus.cancelled:
        raise HTTPException(status_code=400, detail="Meeting already cancelled")

    meeting.status = MeetingStatus.cancelled
    meeting.cancellation_reason = data.reason
    db.commit()
    return {"message": "Meeting cancelled"}
