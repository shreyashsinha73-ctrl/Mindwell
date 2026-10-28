from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import Participant, TestSession, generate_participant_code
from schemas import ParticipantCreate, ParticipantOut, SessionOut

router = APIRouter()


@router.post(
    "/participants",
    response_model=ParticipantOut,
    status_code=status.HTTP_201_CREATED,
)
def create_participant(
    payload: ParticipantCreate, db: Session = Depends(get_db)
) -> Participant:
    participant = Participant(
        age=payload.age,
        code=generate_participant_code(db.connection()),
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


@router.get(
    "/participants/{participant_id}/sessions",
    response_model=list[SessionOut],
)
def get_participant_sessions(
    participant_id: str, db: Session = Depends(get_db)
) -> list[TestSession]:
    participant = db.scalar(
        select(Participant).where(Participant.id == participant_id)
    )
    if participant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="We couldn't find that participant.",
        )

    return list(
        db.scalars(
            select(TestSession)
            .where(TestSession.participant_id == participant_id)
            .order_by(TestSession.created_at.desc())
        )
    )