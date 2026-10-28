from dataclasses import dataclass
import math
from typing import Any

from config import (
    BLOCK_CHANCE_CELLS,
    BLOCK_PARTIAL_CREDIT,
    CATEGORY_THRESHOLDS,
    DIGIT_BACKWARD_FULL,
    DIGIT_FORWARD_FULL,
    GAME_WEIGHTS,
    MEMORY_CHANCE_CORRECT,
    MIN_GAMES_SCORED,
    PATTERN_FULL_LEVEL,
    SCORING_VERSION,
    STAR_ERROR_PENALTY,
    STAR_MAX_ERROR_PENALTY,
    STAR_SPEED_FAST_MS,
    STAR_SPEED_SLOW_MS,
    STAR_SPEED_WEIGHT,
    TARGET_COMMISSION_PENALTY,
    TARGET_MAX_COMMISSION_PENALTY,
    WORD_FULL_COUNT,
    WORD_MAX_REPEAT_PENALTY,
    WORD_REPEAT_PENALTY,
    RiskCategory,
)


class InsufficientDataError(ValueError):
    """Raised when too few games can be scored."""

    def __init__(self) -> None:
        super().__init__(
            "We couldn't score this test because too many games were not completed. "
            "Please try again."
        )


@dataclass(frozen=True)
class ScoringResult:
    total_score: float
    category: RiskCategory
    game_scores: dict[str, float]
    games_scored: int
    scoring_version: str


def _num(data: dict[str, Any], key: str) -> float | None:
    value = data.get(key)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    try:
        numeric_value = float(value)
    except (OverflowError, ValueError):
        return None
    if not math.isfinite(numeric_value):
        return None
    return numeric_value


def _clamp01(value: float) -> float:
    return min(max(value, 0.0), 1.0)


def _nonnegative_count(data: dict[str, Any], key: str) -> float | None:
    value = _num(data, key)
    return value if value is not None and value >= 0 else None


def _pattern_recall(data: Any) -> float | None:
    if not isinstance(data, dict):
        return None
    level = _num(data, "finalLevel")
    if level is None:
        return None
    return 100 * _clamp01(level / PATTERN_FULL_LEVEL)


def _star_connect(data: Any) -> float | None:
    if not isinstance(data, dict):
        return None
    steps = _num(data, "stepsCompleted")
    if steps is None:
        return None

    errors = _nonnegative_count(data, "errors")
    error_penalty = min(
        STAR_MAX_ERROR_PENALTY,
        (errors if errors is not None else 0) * STAR_ERROR_PENALTY,
    )
    accuracy = max(0.0, 100 * _clamp01(steps / 10) - error_penalty)

    speed = 0.0
    average_move_time = _num(data, "averageMoveTime")
    if data.get("completed") is True and average_move_time is not None:
        speed = 100 * _clamp01(
            (STAR_SPEED_SLOW_MS - average_move_time)
            / (STAR_SPEED_SLOW_MS - STAR_SPEED_FAST_MS)
        )

    return (1 - STAR_SPEED_WEIGHT) * accuracy + STAR_SPEED_WEIGHT * speed


def _digit_span(data: Any) -> float | None:
    if not isinstance(data, dict):
        return None
    forward = _num(data, "forward")
    backward = _num(data, "backward")
    if forward is None or backward is None:
        return None
    return 50 * _clamp01(forward / DIGIT_FORWARD_FULL) + 50 * _clamp01(
        backward / DIGIT_BACKWARD_FULL
    )


def _block_builder(data: Any) -> float | None:
    if not isinstance(data, dict) or not isinstance(data.get("isCorrect"), bool):
        return None
    if data["isCorrect"]:
        return 100.0
    cells_correct = _num(data, "cellsCorrect")
    if cells_correct is None:
        return None
    return (
        100
        * _clamp01((cells_correct - BLOCK_CHANCE_CELLS) / 4)
        * BLOCK_PARTIAL_CREDIT
    )


def _target_tap(data: Any) -> float | None:
    if not isinstance(data, dict):
        return None
    hits = _nonnegative_count(data, "hits")
    targets_shown = _nonnegative_count(data, "targetsShown")
    commission_errors = _nonnegative_count(data, "commissionErrors")
    if (
        hits is None
        or targets_shown is None
        or commission_errors is None
        or targets_shown <= 0
    ):
        return None

    penalty = min(
        TARGET_MAX_COMMISSION_PENALTY,
        commission_errors * TARGET_COMMISSION_PENALTY,
    )
    hit_rate = 100 * _clamp01(hits / targets_shown)
    return _clamp01((hit_rate - penalty) / 100) * 100


def _word_storm(data: Any) -> float | None:
    if not isinstance(data, dict):
        return None
    word_count = _num(data, "wordCount")
    if word_count is None:
        return None
    repeats = _nonnegative_count(data, "repeatCount")
    penalty = min(
        WORD_MAX_REPEAT_PENALTY,
        (repeats if repeats is not None else 0) * WORD_REPEAT_PENALTY,
    )
    return max(0.0, 100 * _clamp01(word_count / WORD_FULL_COUNT) - penalty)


def _memory_recall(data: Any) -> float | None:
    if not isinstance(data, dict):
        return None
    skipped = data.get("skipped", False)
    if not isinstance(skipped, bool) or skipped:
        return None
    score = _num(data, "score")
    if score is None:
        return None
    return 100 * _clamp01(
        (score - MEMORY_CHANCE_CORRECT) / (5 - MEMORY_CHANCE_CORRECT)
    )


def _clock_master(data: Any) -> float | None:
    if not isinstance(data, dict):
        return None
    numbers_correct = _num(data, "numbersCorrect")
    if numbers_correct is None:
        return None

    hour_correct = data.get("hourHandCorrect") is True
    minute_correct = data.get("minuteHandCorrect") is True
    return 50 * _clamp01(numbers_correct / 12) + 25 * hour_correct + 25 * minute_correct


_GAME_SCORERS = {
    "patternRecall": _pattern_recall,
    "starConnect": _star_connect,
    "digitSpan": _digit_span,
    "blockBuilder": _block_builder,
    "targetTap": _target_tap,
    "wordStorm": _word_storm,
    "memoryRecall": _memory_recall,
    "clockMaster": _clock_master,
}

# Reaction and speed measures are retained for analysis, but not scored except
# for the small Star Connect speed contribution.


def categorize(score: float) -> RiskCategory:
    for minimum, category in CATEGORY_THRESHOLDS:
        if score >= minimum:
            return category
    return "vulnerable"


def score_session(results: dict[str, Any]) -> ScoringResult:
    raw_game_scores: dict[str, float] = {}
    scored_weights: dict[str, float] = {}

    for game_id, weight in GAME_WEIGHTS.items():
        score = _GAME_SCORERS[game_id](results.get(game_id))
        if score is None or not math.isfinite(score):
            continue
        raw_game_scores[game_id] = min(max(score, 0.0), 100.0)
        scored_weights[game_id] = weight

    games_scored = len(raw_game_scores)
    if games_scored < MIN_GAMES_SCORED:
        raise InsufficientDataError()

    weight_total = sum(scored_weights.values())
    total_score = round(
        sum(
            scored_weights[game_id] * score
            for game_id, score in raw_game_scores.items()
        )
        / weight_total,
        1,
    )
    game_scores = {
        game_id: round(score, 1) for game_id, score in raw_game_scores.items()
    }

    return ScoringResult(
        total_score=total_score,
        category=categorize(total_score),
        game_scores=game_scores,
        games_scored=games_scored,
        scoring_version=SCORING_VERSION,
    )