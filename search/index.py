"""Инвертированный индекс: терм -> ID документа -> частота."""

import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

from search.preprocess import VERSION, preprocess


class Index:
    def __init__(self, documents):
        self.documents = {d["doc_id"]: d for d in documents}
        if len(self.documents) != len(documents):
            raise ValueError("Повторяющийся doc_id")
        self.postings = defaultdict(dict)
        self.lengths = {}
        for doc_id, doc in self.documents.items():
            tokens = preprocess(doc["text"])
            self.lengths[doc_id] = len(tokens)
            for term, count in Counter(tokens).items():
                self.postings[term][doc_id] = count
        self.n = len(self.documents)
        self.avgdl = sum(self.lengths.values()) / self.n if self.n else 0

    def save(self, path, corpus_hash):
        data = {"tokenizer": VERSION, "corpus_sha256": corpus_hash, "documents": list(self.documents.values()), "postings": dict(self.postings), "lengths": self.lengths}
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".tmp")
        temporary.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        temporary.replace(path)

    @classmethod
    def load(cls, path, corpus_hash):
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        if data["tokenizer"] != VERSION or data["corpus_sha256"] != corpus_hash:
            raise ValueError("Индекс устарел")
        # Проверяем статистики при загрузке: повреждённый кэш нельзя использовать.
        index = cls(data["documents"])
        if index.lengths != data["lengths"] or dict(index.postings) != data["postings"]:
            raise ValueError("Повреждены статистики индекса")
        return index


def read_corpus(corpus_path):
    path = Path(corpus_path)
    if path.is_dir():
        files = sorted(path.glob("D[0-9][0-9].jsonl"))
        if not files:
            raise ValueError("Пустой корпус")
        return b"".join(p.read_bytes() for p in files)
    return path.read_bytes()


def load_index(corpus_path, cache_path):
    raw = read_corpus(corpus_path)
    digest = hashlib.sha256(raw).hexdigest()
    try:
        return Index.load(cache_path, digest)
    except (OSError, ValueError, KeyError, TypeError):
        documents = [json.loads(line) for line in raw.decode("utf-8").splitlines() if line.strip()]
        index = Index(documents)
        index.save(cache_path, digest)
        return index
