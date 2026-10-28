from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from config import DISCLAIMER, RiskCategory

BoundedTime = Annotated[
    float, Field(ge=0, le=3_600_000, allow_inf_nan=False)
]
BoundedOptionalTime = Annotated[
    float | None, Field(default=None, ge=0, le=3_600_000, allow_inf_nan=False)
]
BoundedCount = Annotated[int, Field(ge=0, le=1000)]
BoundedWord = Annotated[str, Field(max_length=40)]


class PatternRecallMetrics(BaseModel):
    model_config = ConfigDict(extra="ignore")

    finalLevel: int = Field(ge=0, le=9)
    reactionTime: BoundedOptionalTime
    levelsCleared: int = Field(ge=0, le=9)


class MemoryStoreMetrics(BaseModel):
    model_config = ConfigDict(extra="ignore")

    itemsShown: int = Field(ge=0, le=5)


class StarConnectMetrics(BaseModel):
    model_config = ConfigDict(extra="ignore")

    completed: bool
    stepsCompleted: int = Field(ge=0, le=10)
    errors: BoundedCount
    totalTime: BoundedTime
    averageMoveTime: BoundedOptionalTime


class DigitSpanMetrics(BaseModel):
    model_config = ConfigDict(extra="ignore")

    forward: int = Field(ge=0, le=9)
    backward: int = Field(ge=0, le=9)


class BlockBuilderMetrics(BaseModel):
    model_config = ConfigDict(extra="ignore")

    isCorrect: bool
    cellsCorrect: int = Field(ge=0, le=9)
    completionTime: BoundedTime
    correctionCount: BoundedCount


class TargetTapMetrics(BaseModel):
    model_config = ConfigDict(extra="ignore")

    score: int = Field(ge=-1000, le=1000)
    hits: BoundedCount
    commissionErrors: BoundedCount
    omissionErrors: BoundedCount
    targetsShown: BoundedCount


class WordStormMetrics(BaseModel):
    model_config = ConfigDict(extra="ignore")

    letter: str = Field(min_length=1, max_length=1, pattern=r"^[A-Za-z]$")
    wordCount: BoundedCount
    words: list[BoundedWord] = Field(max_length=200)
    timeToFirstWord: BoundedOptionalTime
    repeatCount: BoundedCount
    invalidCount: BoundedCount

class MemoryRecallMetrics(BaseModel):
    model_config = ConfigDict(extra="ignore")

    score: int = Field(ge=0, le=5)
    falsePositives: int = Field(ge=0, le=5)
    timeToSelect: BoundedTime
    skipped: bool = False


class ClockMasterMetrics(BaseModel):
    model_config = ConfigDict(extra="ignore")

    numbersCorrect: int = Field(ge=0, le=12)
    meanNumberAngleError: float = Field(ge=0, le=180, allow_inf_nan=False)
    hourHandCorrect: bool
    minuteHandCorrect: bool
    hourHandAngleError: float = Field(ge=0, le=180, allow_inf_nan=False)
    minuteHandAngleError: float = Field(ge=0, le=180, allow_inf_nan=False)
    numberPlacementTime: BoundedTime
    totalTime: BoundedTime


class SessionResults(BaseModel):
    model_config = ConfigDict(extra="ignore")

    patternRecall: PatternRecallMetrics | None = None
    memoryStore: MemoryStoreMetrics | None = None
    starConnect: StarConnectMetrics | None = None
    digitSpan: DigitSpanMetrics | None = None
    blockBuilder: BlockBuilderMetrics | None = None
    targetTap: TargetTapMetrics | None = None
    wordStorm: WordStormMetrics | None = None
    memoryRecall: MemoryRecallMetrics | None = None
    clockMaster: ClockMasterMetrics | None = None


class ParticipantCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    age: int | None = Field(default=None, ge=0, le=120)


class ParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str


class SessionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    participant_id: str = Field(min_length=1, max_length=36)
    results: SessionResults


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    participant_id: str
    score: float
    category: RiskCategory
    game_scores: dict[str, float]
    scoring_version: str
    created_at: datetime
    disclaimer: str = DISCLAIMER