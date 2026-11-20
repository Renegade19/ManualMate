"""Пути и параметры локального запуска."""

import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    corpus: Path = ROOT / "corpus/processed/documents.jsonl"
    index: Path = ROOT / ".cache/index.json"
    ollama_url: str = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
    model: str = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
    timeout: float = float(os.getenv("LLM_TIMEOUT", "120"))
    top_k: int = int(os.getenv("TOP_K", "5"))
    k1: float = float(os.getenv("BM25_K1", "1.2"))
    b: float = float(os.getenv("BM25_B", "0.75"))
    min_score: float = float(os.getenv("BM25_MIN_SCORE", "0.5"))
