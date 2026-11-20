"""Сборка 30 карточек с проверкой хешей PDF и якорей страниц."""

import argparse
import hashlib
import json
import re
import urllib.request
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent


def compact(text):
    return re.sub(r"[\s\-­‑–]+", "", text).casefold().replace("ё", "е")


def prepare(download=False, verify=True):
    manifest = json.loads((ROOT / "corpus/manifest.json").read_text())
    selection = json.loads((ROOT / "corpus/selection.json").read_text())
    sources = {d["doc_id"]: d for d in manifest["documents"]}
    readers = {}
    for source_id, source in sources.items():
        path = ROOT / "corpus" / source["file"]
        if download and not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            with urllib.request.urlopen(source["source"], timeout=60) as response:
                path.write_bytes(response.read())
        if verify:
            if hashlib.sha256(path.read_bytes()).hexdigest() != source["sha256"]:
                raise ValueError(f"Хеш PDF изменился: {source_id}; нужна проверка издания")
            readers[source_id] = PdfReader(path)
    documents = []
    for row in selection:
        source = sources[row["source_id"]]
        if verify:
            page_text = readers[row["source_id"]].pages[row["pdf_page"] - 1].extract_text()
            if compact(row["evidence_anchor"]) not in compact(page_text):
                raise ValueError(f"Не найден якорь на странице: {row['doc_id']}")
        documents.append({"doc_id": row["doc_id"], "chunk_id": row["doc_id"], "source_id": row["source_id"],
                          "title": source["title"], "section": row["section"], "models": source["models"], "engines": [],
                          "page": row["pdf_page"] - source["printed_page_offset"], "pdf_page": row["pdf_page"],
                          "source_url": source["source"], "topic": row["topic"], "text": row["text"], "adapted": True})
    path = ROOT / "corpus/processed/documents.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(d, ensure_ascii=False) + "\n" for d in documents), encoding="utf-8")
    print(f"PASS: {len(sources)} PDF, {len(documents)} документов; проверка PDF: {verify}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--skip-pdf-check", action="store_true", help="только пересобрать карточки без исходных PDF")
    args = parser.parse_args()
    prepare(args.download, not args.skip_pdf_check)
