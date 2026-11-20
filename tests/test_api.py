from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from backend.app import create_app
from backend.llm.answer import Answer, GenerationError, Point, validate_answer
from backend.settings import Settings


@pytest.fixture
def client(tmp_path):
    calls = []

    def generator(question, vehicle, chunks, settings):
        calls.append((question, vehicle, chunks))
        return Answer(status="answer", points=[Point(text=chunks[0]["text"], citations=[1])])

    with TestClient(create_app(replace(Settings(), index=tmp_path / "index.json"), generator)) as client:
        client.calls = calls
        yield client


def ask(client, question, model="W213", **vehicle):
    return client.post("/api/ask", json={"question": question, "vehicle": {"model_code": model, **vehicle}})


def test_catalog_and_static_frontend(client):
    data = client.get("/api/vehicles").json()["vehicles"]
    assert [v["documents"] for v in data] == [10, 10, 10]
    assert all(v["engines"] == [] for v in data)
    assert "ManualMate" in client.get("/").text


def test_sources_come_from_index_and_model_filter(client):
    data = ask(client, "Как долить моторное масло?", "X253").json()
    assert data["status"] == "answer" and len(client.calls) == 1
    assert all(s["doc_id"] in {f"D{n}" for n in range(21, 31)} for s in data["sources"])
    assert data["points"][0]["citations"] == [1]
    assert data["sources"][0]["text"] == client.calls[0][2][0]["text"]
    assert data["sources"][0]["matched_terms"]


def test_clarification_and_empty_context_skip_llm(client):
    assert ask(client, "Какое масло?").json()["status"] == "clarify"
    assert ask(client, "ксенофобия").json()["status"] == "no_context"
    assert client.calls == []


@pytest.mark.parametrize("question", ["", "   ", "x" * 501, None, 42])
def test_question_validation(client, question):
    response = ask(client, question)
    assert response.status_code == 400 and response.json() == {"error": "question_invalid"}


def test_unknown_vehicle_engine_and_invalid_json(client):
    assert ask(client, "масло", "BMW").status_code == 404
    assert ask(client, "масло", engine="M264").status_code == 404
    assert client.post("/api/ask", content="{broken", headers={"Content-Type": "application/json"}).status_code == 400


def test_llm_failure_is_503_and_not_refusal(tmp_path):
    def fail(*args):
        raise GenerationError("test")
    with TestClient(create_app(replace(Settings(), index=tmp_path / "index.json"), fail)) as client:
        result = ask(client, "Как долить моторное масло?")
        assert result.status_code == 503
        assert result.json() == {"error": "service_unavailable"}


def test_llm_refusal_keeps_searched_documents(tmp_path):
    with TestClient(create_app(replace(Settings(), index=tmp_path / "index.json"), lambda *args: Answer(status="no_context", points=[]))) as client:
        data = ask(client, "Сколько стоит долив моторного масла?").json()
        assert data["status"] == "no_context" and len(data["searched"]) == 10


def test_no_index_503_and_health(tmp_path, monkeypatch):
    import httpx
    monkeypatch.setattr(httpx, "get", lambda *a, **k: httpx.Response(200, json={"models": []}, request=httpx.Request("GET", "http://test")))
    with TestClient(create_app(replace(Settings(), corpus=tmp_path / "missing"))) as client:
        assert client.get("/api/vehicles").status_code == 503
        assert ask(client, "сервис").status_code == 503
        assert client.get("/api/health").json()["status"] == "degraded"


def test_cors(client):
    response = client.options("/api/ask", headers={"Origin": "http://localhost:8080", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:8080"
    assert "access-control-allow-origin" not in client.get("/api/vehicles", headers={"Origin": "https://unrelated.example"}).headers


@pytest.mark.parametrize("data", [
    {"status": "answer", "points": []},
    {"status": "answer", "points": [{"text": "масло", "citations": [2]}]},
    {"status": "answer", "points": [{"text": "15 литров", "citations": [1]}]},
    {"status": "no_context", "points": [{"text": "масло", "citations": [1]}]},
])
def test_generation_validation(data):
    with pytest.raises(GenerationError):
        validate_answer(data, [{"text": "Моторное масло"}])


def test_metadata_numbers_are_valid_but_new_quantities_are_not():
    chunk = {"text": "Моторное масло", "title": "C-класс W205", "page": 407}
    result = {"status": "answer", "points": [{"text": "Для W205 см. страницу 407 в источнике 1.", "citations": [1]}]}
    assert validate_answer(result, [chunk]).status == "answer"
    result["points"][0]["text"] = "Добавьте 1 литр масла."
    with pytest.raises(GenerationError):
        validate_answer(result, [chunk])
