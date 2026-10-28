import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    test_session = sessionmaker(
        bind=engine, autoflush=False, autocommit=False
    )()
    try:
        yield test_session
    finally:
        test_session.close()
        engine.dispose()


@pytest.fixture
def client(db: Session):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    try:
        yield test_client
    finally:
        app.dependency_overrides.clear()


def perfect_results():
    return {
        "patternRecall": {
            "finalLevel": 6,
            "reactionTime": 500,
            "levelsCleared": 4,
        },
        "memoryStore": {"itemsShown": 5},
        "starConnect": {
            "completed": True,
            "stepsCompleted": 10,
            "errors": 0,
            "totalTime": 15000,
            "averageMoveTime": 2000,
        },
        "digitSpan": {"forward": 7, "backward": 5},
        "blockBuilder": {
            "isCorrect": True,
            "cellsCorrect": 9,
            "completionTime": 10000,
            "correctionCount": 0,
        },
        "targetTap": {
            "score": 10,
            "hits": 10,
            "commissionErrors": 0,
            "omissionErrors": 0,
            "targetsShown": 10,
        },
        "wordStorm": {
            "letter": "A",
            "wordCount": 8,
            "words": ["apple", "angle", "apron", "artist"],
            "timeToFirstWord": 1000,
            "repeatCount": 0,
            "invalidCount": 0,
        },
        "memoryRecall": {
            "score": 5,
            "falsePositives": 0,
            "timeToSelect": 10000,
            "skipped": False,
        },
        "clockMaster": {
            "numbersCorrect": 12,
            "meanNumberAngleError": 0,
            "hourHandCorrect": True,
            "minuteHandCorrect": True,
            "hourHandAngleError": 0,
            "minuteHandAngleError": 0,
            "numberPlacementTime": 10000,
            "totalTime": 15000,
        },
    }


def worst_results():
    return {
        "patternRecall": {
            "finalLevel": 0,
            "reactionTime": None,
            "levelsCleared": 0,
        },
        "memoryStore": {"itemsShown": 0},
        "starConnect": {
            "completed": False,
            "stepsCompleted": 0,
            "errors": 100,
            "totalTime": 120000,
            "averageMoveTime": None,
        },
        "digitSpan": {"forward": 0, "backward": 0},
        "blockBuilder": {
            "isCorrect": False,
            "cellsCorrect": 5,
            "completionTime": 10000,
            "correctionCount": 0,
        },
        "targetTap": {
            "score": -10,
            "hits": 0,
            "commissionErrors": 100,
            "omissionErrors": 10,
            "targetsShown": 10,
        },
        "wordStorm": {
            "letter": "A",
            "wordCount": 0,
            "words": [],
            "timeToFirstWord": None,
            "repeatCount": 100,
            "invalidCount": 100,
        },
        "memoryRecall": {
            "score": 2,
            "falsePositives": 3,
            "timeToSelect": 10000,
            "skipped": False,
        },
        "clockMaster": {
            "numbersCorrect": 0,
            "meanNumberAngleError": 180,
            "hourHandCorrect": False,
            "minuteHandCorrect": False,
            "hourHandAngleError": 180,
            "minuteHandAngleError": 180,
            "numberPlacementTime": 10000,
            "totalTime": 15000,
        },
    }
