import re
import time

import pytest
from sqlalchemy import func, select

from models import Participant, TestSession as SessionRecord
from scoring import score_session
from tests.conftest import perfect_results, worst_results


def create_participant(client, age=72):
    response = client.post("/api/participants", json={"age": age})
    assert response.status_code == 201
    return response.json()


def post_session(client, participant_id, results=None):
    return client.post(
        "/api/sessions",
        json={
            "participant_id": participant_id,
            "results": results if results is not None else perfect_results(),
        },
    )


def test_create_participant_returns_anonymous_id_and_code(client):
    response = client.post("/api/participants", json={"age": 72})

    assert response.status_code == 201
    body = response.json()
    assert body["id"]
    assert re.fullmatch(r"MW-[A-Z2-9]{4}", body["code"])
    assert not set(body["code"]) & set("0O1IL")


@pytest.mark.parametrize("payload", [{}, {"age": None}])
def test_create_participant_accepts_omitted_or_null_age(client, payload):
    response = client.post("/api/participants", json=payload)
    assert response.status_code == 201


@pytest.mark.parametrize(
    "payload",
    [{"age": 72, "name": "Not accepted"}, {"age": 150}, {"age": -1}],
)
def test_create_participant_rejects_extra_or_out_of_range_fields(client, payload):
    assert client.post("/api/participants", json=payload).status_code == 422


def test_participants_receive_different_codes(client):
    first = create_participant(client)
    second = create_participant(client)
    assert first["code"] != second["code"]


def test_perfect_session_returns_scores_and_disclaimer(client):
    participant = create_participant(client)
    response = post_session(client, participant["id"])

    assert response.status_code == 201
    body = response.json()
    assert body["score"] == 100.0
    assert body["category"] == "healthy"
    assert set(body["game_scores"]) == {
        "patternRecall",
        "starConnect",
        "digitSpan",
        "blockBuilder",
        "targetTap",
        "wordStorm",
        "memoryRecall",
        "clockMaster",
    }
    assert "memoryStore" not in body["game_scores"]
    assert body["scoring_version"]
    assert body["created_at"]
    assert body["disclaimer"]


def test_worst_session_returns_zero_and_vulnerable(client):
    participant = create_participant(client)
    response = post_session(client, participant["id"], worst_results())

    assert response.status_code == 201
    assert response.json()["score"] == 0.0
    assert response.json()["category"] == "vulnerable"


def test_get_session_matches_post_response(client):
    participant = create_participant(client)
    posted = post_session(client, participant["id"])
    fetched = client.get(f"/api/sessions/{posted.json()['id']}")

    assert fetched.status_code == 200
    assert fetched.json() == posted.json()


def test_stored_raw_results_equal_submitted_results(client, db):
    participant = create_participant(client)
    submitted = perfect_results()
    response = post_session(client, participant["id"], submitted)

    assert response.status_code == 201
    row = db.get(SessionRecord, response.json()["id"])
    assert row is not None
    assert row.results == submitted


def test_submission_with_one_game_missing_scores_with_renormalized_weights(client):
    participant = create_participant(client)
    submitted = perfect_results()
    del submitted["clockMaster"]
    expected = score_session(submitted)

    response = post_session(client, participant["id"], submitted)

    assert response.status_code == 201
    assert response.json()["score"] == expected.total_score


def test_five_scoreable_games_return_422_without_storing_session(client, db):
    participant = create_participant(client)
    submitted = perfect_results()
    for game_id in ("patternRecall", "starConnect", "digitSpan"):
        del submitted[game_id]

    response = post_session(client, participant["id"], submitted)

    assert response.status_code == 422
    assert "couldn't score" in response.json()["detail"].lower()
    assert db.scalar(select(func.count()).select_from(SessionRecord)) == 0


def test_unknown_participant_submission_returns_404_and_stores_nothing(client, db):
    response = post_session(client, "unknown-participant")

    assert response.status_code == 404
    assert response.json()["detail"] == "We couldn't find that participant."
    assert db.scalar(select(func.count()).select_from(SessionRecord)) == 0


def test_unknown_session_returns_404(client):
    response = client.get("/api/sessions/unknown-session")

    assert response.status_code == 404
    assert response.json()["detail"] == "We couldn't find that result."


def test_wrong_metric_type_returns_422(client):
    participant = create_participant(client)
    submitted = perfect_results()
    submitted["patternRecall"]["finalLevel"] = "high"

    assert post_session(client, participant["id"], submitted).status_code == 422


def test_extra_top_level_field_returns_422(client):
    participant = create_participant(client)
    response = client.post(
        "/api/sessions",
        json={
            "participant_id": participant["id"],
            "results": perfect_results(),
            "name": "Not accepted",
        },
    )
    assert response.status_code == 422


def test_unknown_game_metric_key_is_ignored(client):
    participant = create_participant(client)
    submitted = perfect_results()
    submitted["patternRecall"]["newFrontendMetric"] = 42

    assert post_session(client, participant["id"], submitted).status_code == 201


def test_history_is_newest_first(client):
    participant = create_participant(client)
    first = post_session(client, participant["id"]).json()
    time.sleep(0.01)
    second = post_session(client, participant["id"]).json()

    response = client.get(f"/api/participants/{participant['id']}/sessions")

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [second["id"], first["id"]]


def test_history_is_limited_to_participant(client):
    first_participant = create_participant(client)
    second_participant = create_participant(client)
    first_session = post_session(client, first_participant["id"]).json()
    second_session = post_session(client, second_participant["id"]).json()

    history = client.get(
        f"/api/participants/{first_participant['id']}/sessions"
    ).json()

    assert [item["id"] for item in history] == [first_session["id"]]
    assert second_session["id"] not in [item["id"] for item in history]


def test_unknown_participant_history_returns_404(client):
    response = client.get("/api/participants/unknown-participant/sessions")

    assert response.status_code == 404
    assert response.json()["detail"] == "We couldn't find that participant."


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_preflight_allows_frontend_and_rejects_unknown_origin(client):
    allowed = client.options(
        "/api/sessions",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert allowed.status_code == 200
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:5173"

    rejected = client.options(
        "/api/sessions",
        headers={
            "Origin": "http://evil.example",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert rejected.status_code == 400
    assert "access-control-allow-origin" not in rejected.headers


def test_deleting_participant_cascades_sessions(client, db):
    participant_data = create_participant(client)
    created = post_session(client, participant_data["id"])
    participant = db.get(Participant, participant_data["id"])
    assert participant is not None

    db.delete(participant)
    db.commit()

    assert db.get(SessionRecord, created.json()["id"]) is None