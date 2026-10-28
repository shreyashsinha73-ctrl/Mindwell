from typing import Literal

SCORING_VERSION = "0.1-placeholder"
RiskCategory = Literal[
    "vulnerable", "high risk", "moderate risk", "low risk", "healthy"
]

# Placeholder thresholds; replace with clinically validated cutoffs before any real-world use.
CATEGORY_THRESHOLDS: list[tuple[float, RiskCategory]] = [
    (80, "healthy"),
    (65, "low risk"),
    (50, "moderate risk"),
    (35, "high risk"),
    (0, "vulnerable"),
]

# Placeholder weights for development only.
GAME_WEIGHTS: dict[str, float] = {
    "patternRecall": 0.12,
    "starConnect": 0.12,
    "digitSpan": 0.12,
    "blockBuilder": 0.08,
    "targetTap": 0.12,
    "wordStorm": 0.12,
    "memoryRecall": 0.16,
    "clockMaster": 0.16,
}
assert sum(GAME_WEIGHTS.values()) == 1.0

MIN_GAMES_SCORED = 6

# Placeholder formula values; validate clinically before real-world use.
PATTERN_FULL_LEVEL = 6
DIGIT_FORWARD_FULL = 7
DIGIT_BACKWARD_FULL = 5
WORD_FULL_COUNT = 8
WORD_REPEAT_PENALTY = 5
WORD_MAX_REPEAT_PENALTY = 20
STAR_ERROR_PENALTY = 5
STAR_MAX_ERROR_PENALTY = 30
STAR_SPEED_FAST_MS = 2000
STAR_SPEED_SLOW_MS = 8000
STAR_SPEED_WEIGHT = 0.2
TARGET_COMMISSION_PENALTY = 10
TARGET_MAX_COMMISSION_PENALTY = 40
BLOCK_CHANCE_CELLS = 5
BLOCK_PARTIAL_CREDIT = 0.75
MEMORY_CHANCE_CORRECT = 2.5

DISCLAIMER = (
    "This is a screening indicator based on game performance. "
    "It is not a medical diagnosis. Please speak to a doctor if you have any concerns."
)