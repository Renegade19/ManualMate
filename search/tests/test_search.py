import math

import pytest

from search.bm25 import search
from search.index import Index, load_index
from search.preprocess import matched_terms, preprocess, query_terms


def docs(texts):
    return [{"doc_id": k, "text": v, "models": ["W213"]} for k, v in texts.items()]


def test_lecture_example_and_tie_breaking():
    # Ручной пример из лекции, включая длину 4 и два слова запроса.
    index = Index(docs({"A": "возврат оплаты карта банк", "B": "статус оплаты экран телефон", "C": "возврат билет касса билет"}))
    hits = search(index, ["возврат", "оплата"], "W213", top_k=3)
    assert index.n == 3 and index.avgdl == 4
    assert index.postings["возврат"] == {"A": 1, "C": 1}
    assert [h["doc_id"] for h in hits] == ["A", "B", "C"]
    assert hits[0]["score"] == pytest.approx(2 * math.log(1 + 1.5 / 2.5))
    assert hits[1]["score"] == pytest.approx(hits[2]["score"])
    assert search(index, ["возврат", "оплата", "возврат"], "W213") == hits


def test_frequency_and_length_formula():
    index = Index(docs({"A": "масло масло", "B": "масло шины давление замена"}))
    hits = search(index, ["масло"], "W213", k1=1.2, b=.75)
    expected = math.log(1 + .5 / 2.5) * 2 * 2.2 / (2 + 1.2 * (.25 + .75 * 2 / 3))
    assert hits[0]["doc_id"] == "A" and hits[0]["score"] == pytest.approx(expected)


def test_filter_uses_global_statistics_and_general_documents():
    rows = docs({"A": "масло", "B": "масло", "C": "масло"})
    rows[1]["models"] = ["X253"]
    rows[2]["models"] = ["*"]
    index = Index(rows)
    hits = search(index, ["масло"], "W213")
    assert [h["doc_id"] for h in hits] == ["A", "C"]
    assert hits[0]["score"] == pytest.approx(math.log(1 + .5 / 3.5))
    rows[0]["engines"] = ["OM654"]
    penalized = search(Index(rows), ["масло"], "W213", engine="M264")
    assert [h["doc_id"] for h in penalized] == ["C", "A"]


def test_empty_queries_and_parameters():
    assert search(Index([]), [], "W213") == []
    index = Index(docs({"A": "", "B": "масло"}))
    assert search(index, [], "W213") == []
    assert search(index, ["ксенофобия"], "W213") == []
    for options in [{"top_k": 0}, {"k1": 0}, {"k1": float("nan")}, {"b": 2}]:
        with pytest.raises(ValueError):
            search(index, ["масло"], "W213", **options)


def test_preprocess_preserves_codes_negation_and_morphology():
    terms = preprocess("Масла, маслом; 5W-30, MB 229.5, OM654, DOT 4+. Нельзя, не применяйте!")
    assert terms[:2] == ["масло", "масло"]
    assert {"5w-30", "mb229.5", "om654", "dot4+", "нельзя", "не"} <= set(terms)
    assert "жидкость" in query_terms("антифриз")
    assert "жидкость" not in preprocess("антифриз")
    assert matched_terms("Маслом: MB 229.5, 5W-30", ["масло", "mb229.5"]) == ["Маслом", "MB 229.5"]


def test_index_roundtrip_stale_and_corrupt_cache(tmp_path):
    import json
    corpus = tmp_path / "corpus.jsonl"
    cache = tmp_path / "index.json"
    corpus.write_text(json.dumps(docs({"A": "масло"})[0]) + "\n")
    first = load_index(corpus, cache)
    assert load_index(corpus, cache).postings == first.postings
    cache.write_text("broken")
    assert load_index(corpus, cache).n == 1
    corpus.write_text(json.dumps(docs({"B": "шина"})[0]) + "\n")
    assert set(load_index(corpus, cache).documents) == {"B"}
    with pytest.raises(ValueError):
        Index(docs({"A": "масло"}) * 2)
