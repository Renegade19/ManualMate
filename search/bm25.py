"""BM25 по формуле лекции; глобальные N, DF, avgdl, фильтр по модели."""

from collections import defaultdict
from math import isfinite, log


def search(index, terms, model_code, top_k=5, k1=1.2, b=0.75, engine=None):
    if top_k < 1 or not isfinite(k1) or k1 <= 0 or not isfinite(b) or not 0 <= b <= 1:
        raise ValueError("Неверные параметры BM25")
    if not index.n or not index.avgdl:
        return []
    scores = defaultdict(float)
    for term in dict.fromkeys(terms):
        postings = index.postings.get(term, {})
        df = len(postings)
        idf = log(1 + (index.n - df + 0.5) / (df + 0.5))
        for doc_id, tf in postings.items():
            doc = index.documents[doc_id]
            if model_code not in doc["models"] and "*" not in doc["models"]:
                continue
            norm = k1 * (1 - b + b * index.lengths[doc_id] / index.avgdl)
            scores[doc_id] += idf * tf * (k1 + 1) / (tf + norm)
    for doc_id in scores:
        engines = index.documents[doc_id].get("engines", [])
        if engine and engines and engine not in engines:
            scores[doc_id] *= 0.5
    ranked = sorted(scores, key=lambda doc_id: (-scores[doc_id], doc_id))[:top_k]
    return [{**index.documents[d], "score": scores[d]} for d in ranked]
