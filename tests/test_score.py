import hashlib
import json

import pytest

from benchmark.score import score


def test_service_errors_are_not_correct_rejections_and_reviews_bound_to_report(tmp_path):
    rows = [{"id": f"Q{n:02d}", "expected": "answer", "relevant": ["A", "B", "C"],
             "retrieved": [{"doc_id": "A"}], "response": {"status": "answer"}} for n in range(1, 11)]
    rows += [{"id": f"Q{n:02d}", "expected": "no_context", "relevant": [], "retrieved": [],
              **({"error": "service_unavailable"} if n == 11 else {"response": {"status": "no_context"}})} for n in range(11, 16)]
    report = tmp_path / "report.json"
    report.write_text(json.dumps({"complete": True, "mode": "ollama", "parameters": {"k": 5}, "results": rows}))
    reviews = tmp_path / "reviews.json"
    data = {"report_sha256": hashlib.sha256(report.read_bytes()).hexdigest(),
            "answers": [{"id": f"Q{n:02d}", "correct": n < 6, "reason": "Тестовая оценка"} for n in range(1, 11)]}
    reviews.write_text(json.dumps(data))
    metrics = score(report, reviews)
    assert metrics["Accuracy"] == .5
    assert metrics["Correct Rejection Rate"] == .8
    report.write_text(report.read_text() + "\n")
    with pytest.raises(ValueError, match="другому прогону"):
        score(report, reviews)
