"""Расчёт четырёх метрик по сохранённому прогону и его оценкам."""

import hashlib
import json
import sys
from pathlib import Path

from benchmark.metrics import retrieval_metrics


def score(report_path, reviews_path):
    raw = Path(report_path).read_bytes()
    report = json.loads(raw)
    reviews = json.loads(Path(reviews_path).read_text())
    if not report["complete"] or report["mode"] != "ollama":
        raise ValueError("Нужен полный прогон с LLM")
    if reviews["report_sha256"] != hashlib.sha256(raw).hexdigest():
        raise ValueError("Оценки относятся к другому прогону")
    normal = [r for r in report["results"] if r["expected"] == "answer"]
    traps = [r for r in report["results"] if r["expected"] == "no_context"]
    if len(normal) != 10 or len(traps) != 5:
        raise ValueError("Набор должен содержать 10 обычных вопросов и 5 ловушек")
    grades = {r["id"]: r for r in reviews["answers"]}
    if len(grades) != 10 or set(grades) != {r["id"] for r in normal}:
        raise ValueError("Нужны оценки всех 10 ответов без повторов")
    for r in normal:
        grade = grades[r["id"]]
        if type(grade["correct"]) is not bool or not grade["reason"].strip():
            raise ValueError("Оценка должна содержать correct и пояснение")
        if grade["correct"] and ("error" in r or r.get("response", {}).get("status") != "answer"):
            raise ValueError("Ошибка/отказ на обычный вопрос не является правильным ответом")
    return {**retrieval_metrics(report["results"], report["parameters"]["k"]),
            "Accuracy": sum(grades[r["id"]]["correct"] for r in normal) / len(normal),
            "Correct Rejection Rate": sum("error" not in r and r.get("response", {}).get("status") == "no_context" for r in traps) / len(traps)}


if __name__ == "__main__":
    print(json.dumps(score(*sys.argv[1:]), ensure_ascii=False, indent=2))
