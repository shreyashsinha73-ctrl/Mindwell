import secrets
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    desc,
    event,
    select,
)
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base

CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def generate_participant_code(connection: Connection, retries: int = 20) -> str:
    for _ in range(retries):
        suffix = "".join(secrets.choice(CODE_ALPHABET) for _ in range(4))
        code = f"MW-{suffix}"
        exists = connection.execute(
            select(Participant.id).where(Participant.code == code)
        ).first()
        if exists is None:
            return code

    raise RuntimeError("Could not generate a unique participant code.")


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    code: Mapped[str] = mapped_column(
        String(8), unique=True, index=True, nullable=False
    )
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    sessions: Mapped[list["TestSession"]] = relationship(
        back_populates="participant",
        order_by=lambda: desc(TestSession.created_at),
        cascade="all, delete-orphan",
    )


@event.listens_for(Participant, "before_insert")
def assign_participant_code(
    _mapper: Any, connection: Connection, participant: Participant
) -> None:
    if not participant.code:
        participant.code = generate_participant_code(connection)


class TestSession(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    participant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("participants.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    results: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    game_scores: Mapped[dict[str, float]] = mapped_column(JSON, nullable=False)
    scoring_version: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    participant: Mapped[Participant] = relationship(back_populates="sessions")