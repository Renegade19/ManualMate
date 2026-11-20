"""python -m benchmark.run --output benchmark/reports/kt2.json"""

import argparse
import hashlib
import json
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

from backend.llm.answer import GenerationError
from backend.service import RAGService
from backend.settings import ROOT, Settings
from benchmark.metrics import retrieval_metrics


def code_hash():
    digest = hashlib.sha256()
    paths = sorted(p for directory in ["backend", "search", "benchmark"] for p in (ROOT / directory).rglob("*.py"))
    for path in paths:
        digest.update(str(path.relative_to(ROOT)).encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()


def run(output, retrieval_only=False):
    settings = Settings()
    service = RAGService(settings)
    raw = (ROOT / "benchmark/queries.jsonl").read_bytes()
    queries = [json.loads(line) for line in raw.decode().splitlines() if line.strip()]
    assert len(queries) == 15 and sum(q["expected"] == "answer" for q in queries) == 10
    assert len({q["id"] for q in queries}) == 15 and service.index.n == 30
    for q in queries:
        assert q["expected"] != "answer" or len(set(q["relevant"])) >= 3
        assert set(q["relevant"]) <= service.index.documents.keys()
    model_digest = None
    if not retrieval_only:
        response = httpx.get(settings.ollama_url + "/api/tags", timeout=5, trust_env=False)
        response.raise_for_status()
        model_digest = next(m["digest"] for m in response.json()["models"] if m["name"] == settings.model)
    report = {"created_at": datetime.now(timezone.utc).isoformat(), "base_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
              "code_sha256": code_hash(), "corpus_sha256": hashlib.sha256(settings.corpus.read_bytes()).hexdigest(),
              "queries_sha256": hashlib.sha256(raw).hexdigest(), "mode": "retrieval_only" if retrieval_only else "ollama",
              "parameters": {"k": settings.top_k, "mrr_depth": settings.top_k, "k1": settings.k1, "b": settings.b, "min_score": settings.min_score,
                             "model": settings.model, "model_digest": model_digest, "temperature": 0, "seed": 42}, "results": []}
    for q in queries:
        started = time.perf_counter()
        vehicle = {"model_code": q["model_code"]}
        hits = service.retrieve(q["query"], vehicle)
        result = {**q, "retrieved": [{k: h[k] for k in ["doc_id", "score", "page", "section"]} for h in hits]}
        if not retrieval_only:
            try:
                result["response"] = service.ask(q["query"], vehicle)
            except GenerationError as exc:
                result["error"] = str(exc)
                result["invalid_generation"] = exc.output
        result["elapsed_ms"] = round((time.perf_counter() - started) * 1000, 1)
        report["results"].append(result)
        # Сохраняем прогресс: незаконченный прогон нельзя принять за итоговый.
        report["complete"] = len(report["results"]) == len(queries)
        report["metrics"] = retrieval_metrics(report["results"], settings.top_k)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        print(q["id"], result.get("response", {}).get("status", result.get("error", "retrieved")), f'{result["elapsed_ms"]} ms', flush=True)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "benchmark/reports/kt2.json")
    parser.add_argument("--retrieval-only", action="store_true")
    args = parser.parse_args()
    run(args.output, args.retrieval_only)
