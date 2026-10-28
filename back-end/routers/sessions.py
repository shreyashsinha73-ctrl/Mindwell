from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import Participant, TestSession
from schemas import SessionCreate, SessionOut
from scoring import InsufficientDataError, score_session

router = APIRouter()


@router.post(
    "/sessions",
    response_model=SessionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    payload: SessionCreate, db: Session = Depends(get_db)
) -> TestSession:
    participant = db.scalar(
        select(Participant).where(Participant.id == payload.participant_id)
    )
    if participant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="We couldn't find that participant.",
        )

    results = payload.results.model_dump(exclude_none=True)
    try:
        scoring_result = score_session(results)
    except InsufficientDataError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    session = TestSession(
        participant_id=participant.id,
        results=results,
        score=scoring_result.total_score,
        category=scoring_result.category,
        game_scores=scoring_result.game_scores,
        scoring_version=scoring_result.scoring_version,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions/{session_id}", response_model=SessionOut)
def get_session(session_id: str, db: Session = Depends(get_db)) -> TestSession:
    session = db.scalar(select(TestSession).where(TestSession.id == session_id))
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="We couldn't find that result.",
        )
    return session