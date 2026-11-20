import pytest

from benchmark.metrics import recall_at_k, reciprocal_rank, retrieval_metrics


def test_lecture_metrics():
    assert recall_at_k(["A", "D", "F"], ["B", "A", "D"], 3) == pytest.approx(2 / 3)
    assert reciprocal_rank(["A", "D", "F"], ["B", "A", "D"], 3) == .5
    assert reciprocal_rank(["A"], ["B", "C"], 2) == 0


def test_traps_excluded_and_duplicate_ids_not_counted_twice():
    data = [{"expected": "answer", "relevant": ["A", "B", "C"], "retrieved": [{"doc_id": d} for d in ["A", "A", "B"]]},
            {"expected": "no_context", "relevant": [], "retrieved": []}]
    assert retrieval_metrics(data, 3) == {"Recall@3": 2 / 3, "MRR@3": 1.0}
