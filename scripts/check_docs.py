"""Проверка документации: обязательные файлы, локальные ссылки, формат примера benchmark."""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

REQUIRED = [
    "README.md",
    "AGENTS.md",
    "CONTRIBUTING.md",
    "CHANGE_HISTORY.md",
    "frontend/index.html",
    "frontend/styles.css",
    "frontend/script.js",
    "frontend/api.js",
    "frontend/config.js",
    "frontend/demo.js",
    "frontend/README.md",
    "spec/product/product.md",
    "spec/product/scenarios.md",
    "spec/product/interface.md",
    "spec/tech/architecture.md",
    "spec/tech/api.md",
    "spec/tech/rag.md",
    "spec/tech/testing.md",
    "spec/team.md",
    "spec/plan.md",
    "spec/decisions.md",
    "docs/checkpoint-1.md",
    "docs/demo-script.md",
    "docs/repository-structure.md",
    "docs/sources.md",
    "docs/verification.md",
    "corpus/README.md",
    "benchmark/README.md",
    "benchmark/questions.example.jsonl",
    "benchmark/queries.jsonl",
    "corpus/manifest.json",
    "corpus/selection.json",
    "corpus/processed/documents.jsonl",
    "backend/app.py",
    "search/bm25.py",
    "docs/checkpoint-2.md",
]

BENCHMARK_FIELDS = {"id", "split", "model_code", "query", "expected", "relevant"}
MODELS = {"W205", "W213", "X253"}
EXPECTED = {"answer", "clarify", "no_context"}

LINK = re.compile(r"!?\[[^\]]*\]\(([^)\s]+)\)")


def check_required(errors):
    for rel in REQUIRED:
        if not (ROOT / rel).is_file():
            errors.append(f"нет обязательного файла: {rel}")
    return len(REQUIRED)


def check_links(errors):
    count = 0
    for md in sorted(ROOT.rglob("*.md")):
        if any(part in {".git", ".venv", "node_modules", ".cache", ".tools", "tmp"} for part in md.relative_to(ROOT).parts):
            continue
        for target in LINK.findall(md.read_text(encoding="utf-8")):
            if re.match(r"^[a-z]+:", target) or target.startswith("#"):
                continue
            path = target.split("#", 1)[0]
            count += 1
            if not (md.parent / path).exists():
                errors.append(f"{md.relative_to(ROOT)}: битая ссылка {target}")
    return count


def check_benchmark(errors):
    path = ROOT / "benchmark/questions.example.jsonl"
    if not path.is_file():
        return 0
    lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    for number, line in enumerate(lines, 1):
        where = f"benchmark пример, строка {number}"
        try:
            item = json.loads(line)
        except json.JSONDecodeError as error:
            errors.append(f"{where}: {error}")
            continue
        missing = BENCHMARK_FIELDS - item.keys()
        if missing:
            errors.append(f"{where}: нет полей {', '.join(sorted(missing))}")
            continue
        if item["model_code"] not in MODELS:
            errors.append(f"{where}: неизвестная модель {item['model_code']}")
        if item["expected"] not in EXPECTED:
            errors.append(f"{where}: неизвестное expected {item['expected']}")
        if item["expected"] == "answer" and len(item["relevant"]) < 3:
            errors.append(f"{where}: для answer нужно не менее трёх релевантных фрагментов")
    return len(lines)


def check_checkpoint_data(errors):
    try:
        documents = [json.loads(line) for line in (ROOT / "corpus/processed/documents.jsonl").read_text().splitlines() if line.strip()]
        questions = [json.loads(line) for line in (ROOT / "benchmark/queries.jsonl").read_text().splitlines() if line.strip()]
        manifest = json.loads((ROOT / "corpus/manifest.json").read_text())
        sources = {d["doc_id"] for d in manifest["documents"]}
        ids = {d["doc_id"] for d in documents}
        if len(documents) != 30 or ids != {f"D{n:02d}" for n in range(1, 31)}:
            errors.append("КТ2: нужно ровно 30 уникальных документов D01–D30")
        for d in documents:
            if d["source_id"] not in sources or not d["text"].strip() or type(d["page"]) is not int or d["page"] < 1:
                errors.append(f"КТ2: неверные metadata документа {d['doc_id']}")
        if len(questions) != 15 or len({q["id"] for q in questions}) != 15:
            errors.append("КТ2: нужно 15 уникальных вопросов")
        if sum(q["expected"] == "answer" for q in questions) != 10 or sum(q["expected"] == "no_context" for q in questions) != 5:
            errors.append("КТ2: нужно 10 обычных вопросов и 5 ловушек")
        for q in questions:
            if not q["reference_answer"].strip() or not 1 <= len(q["query"]) <= 500 or q["model_code"] not in MODELS:
                errors.append(f"КТ2: неверный вопрос/эталон {q['id']}")
            if q["expected"] == "answer" and (len(set(q["relevant"])) < 3 or not set(q["relevant"]) <= ids):
                errors.append(f"КТ2: нужны ≥3 существующих релевантных ID у {q['id']}")
            if q["expected"] == "no_context" and q["relevant"]:
                errors.append(f"КТ2: ловушка {q['id']} содержит релевантные ID")
    except (OSError, ValueError, KeyError, TypeError) as exc:
        errors.append(f"КТ2: не удалось проверить данные: {exc}")


def main():
    errors = []
    files = check_required(errors)
    links = check_links(errors)
    questions = check_benchmark(errors)
    check_checkpoint_data(errors)
    for error in errors:
        print(f"FAIL {error}")
    if errors:
        return 1
    print(f"PASS: {files} обязательных файлов, {links} локальных ссылок, {questions} примеров benchmark")
    return 0


if __name__ == "__main__":
    sys.exit(main())
