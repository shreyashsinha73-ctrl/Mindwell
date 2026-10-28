import pytest
from pydantic import ValidationError

from config import CATEGORY_THRESHOLDS, GAME_WEIGHTS
from schemas import ParticipantCreate, SessionResults
from scoring import InsufficientDataError, categorize, score_session


def perfect_results():
    return {
        "patternRecall": {
            "finalLevel": 6,
            "reactionTime": 500,
            "levelsCleared": 4,
        },
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
            "words": ["apple", "angle"],
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
    results = perfect_results()
    results.update(
        {
            "patternRecall": {
                "finalLevel": 0,
                "reactionTime": None,
                "levelsCleared": 0,
            },
            "starConnect": {
                "completed": False,
                "stepsCompleted": 0,
                "errors": 100,
                "totalTime": 10000,
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
                "score": -4,
                "hits": 0,
                "commissionErrors": 100,
                "omissionErrors": 1,
                "targetsShown": 1,
            },
            "wordStorm": {
                "letter": "A",
                "wordCount": 0,
                "words": [],
                "timeToFirstWord": None,
                "repeatCount": 100,
                "invalidCount": 0,
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
    )
    return results


def test_perfect_submission_scores_100_and_healthy():
    result = score_session(perfect_results())
    assert result.total_score == 100.0
    assert result.category == "healthy"
    assert result.games_scored == 8
    assert all(score == 100.0 for score in result.game_scores.values())


def test_worst_case_scores_zero_and_vulnerable():
    result = score_session(worst_results())
    assert result.total_score == 0.0
    assert result.category == "vulnerable"


def test_empty_results_raise_insufficient_data():
    with pytest.raises(InsufficientDataError):
        score_session({})


def test_five_games_raise_and_six_games_score():
    results = perfect_results()
    for game_id in list(results)[:3]:
        del results[game_id]
    with pytest.raises(InsufficientDataError):
        score_session(results)

    six_games = perfect_results()
    for game_id in list(six_games)[:2]:
        del six_games[game_id]
    assert score_session(six_games).games_scored == 6


def test_remaining_game_weights_are_renormalised():
    results = perfect_results()
    results["patternRecall"]["finalLevel"] = 0
    del results["starConnect"]

    result = score_session(results)
    remaining_weight = sum(
        weight for game_id, weight in GAME_WEIGHTS.items() if game_id != "starConnect"
    )
    expected = round(
        (
            (remaining_weight - GAME_WEIGHTS["patternRecall"])
            / remaining_weight
        )
        * 100,
        1,
    )
    assert result.total_score == expected


def test_skipped_memory_recall_is_excluded():
    results = perfect_results()
    results["memoryRecall"]["skipped"] = True
    result = score_session(results)
    assert "memoryRecall" not in result.game_scores
    assert result.games_scored == 7


@pytest.mark.parametrize(("memory_score", "expected"), [(2, 0.0), (5, 100.0)])
def test_memory_recall_chance_and_full_credit(memory_score, expected):
    results = perfect_results()
    results["memoryRecall"]["score"] = memory_score
    assert score_session(results).game_scores["memoryRecall"] == expected


@pytest.mark.parametrize("threshold,category", CATEGORY_THRESHOLDS)
def test_category_threshold_boundaries(threshold, category):
    below_category = categorize(threshold - 0.01)
    equal_category = categorize(threshold)
    above_category = categorize(threshold + 0.01)

    assert equal_category == category
    assert above_category == category
    if threshold == 0:
        assert below_category == "vulnerable"
    else:
        previous_category = next(
            candidate
            for minimum, candidate in CATEGORY_THRESHOLDS
            if minimum < threshold
        )
        assert below_category == previous_category


def test_out_of_range_game_metric_is_clamped():
    results = perfect_results()
    results["patternRecall"]["finalLevel"] = 99
    assert score_session(results).game_scores["patternRecall"] == 100.0


def test_malformed_game_is_skipped_without_crashing():
    results = perfect_results()
    results["patternRecall"]["finalLevel"] = "high"
    result = score_session(results)
    assert "patternRecall" not in result.game_scores
    assert result.games_scored == 7


def test_boolean_is_not_treated_as_a_number():
    results = perfect_results()
    results["patternRecall"]["finalLevel"] = True
    result = score_session(results)
    assert "patternRecall" not in result.game_scores
    assert result.games_scored == 7


@pytest.mark.parametrize(
    ("game_id", "metric", "lower", "higher"),
    [
        ("patternRecall", "finalLevel", 2, 3),
        ("starConnect", "stepsCompleted", 5, 6),
        ("digitSpan", "forward", 3, 4),
        ("blockBuilder", "cellsCorrect", 6, 7),
        ("targetTap", "hits", 5, 6),
        ("wordStorm", "wordCount", 3, 4),
        ("memoryRecall", "score", 3, 4),
        ("clockMaster", "numbersCorrect", 6, 7),
    ],
)
def test_improving_a_scored_metric_does_not_lower_total(
    game_id, metric, lower, higher
):
    results = perfect_results()
    results[game_id][metric] = lower
    lower_total = score_session(results).total_score
    results[game_id][metric] = higher
    assert score_session(results).total_score >= lower_total


@pytest.mark.parametrize(
    ("game_id", "metric", "worse", "better"),
    [
        ("starConnect", "errors", 4, 3),
        ("starConnect", "averageMoveTime", 5000, 4000),
        ("targetTap", "commissionErrors", 2, 1),
        ("wordStorm", "repeatCount", 2, 1),
        ("clockMaster", "hourHandCorrect", False, True),
    ],
)
def test_improving_penalty_or_accuracy_metric_does_not_lower_total(
    game_id, metric, worse, better
):
    results = perfect_results()
    results[game_id][metric] = worse
    lower_total = score_session(results).total_score
    results[game_id][metric] = better
    assert score_session(results).total_score >= lower_total


def test_full_payload_validates_and_scores_end_to_end():
    payload = perfect_results()
    payload["memoryStore"] = {"itemsShown": 5}
    validated = SessionResults.model_validate(payload).model_dump(exclude_none=True)
    result = score_session(validated)
    assert result.total_score == 100.0
    assert "memoryStore" not in result.game_scores


def test_participant_create_rejects_direct_identifier():
    with pytest.raises(ValidationError):
        ParticipantCreate.model_validate({"age": 70, "name": "Example"})