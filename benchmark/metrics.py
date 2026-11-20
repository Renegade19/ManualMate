"""Метрики поиска считаются только по обычным вопросам."""


def recall_at_k(relevant, ranked, k):
    return len(set(relevant) & set(ranked[:k])) / len(set(relevant)) if relevant else 0.0


def reciprocal_rank(relevant, ranked, k):
    return next((1 / rank for rank, doc_id in enumerate(ranked[:k], 1) if doc_id in relevant), 0.0)


def retrieval_metrics(results, k):
    normal = [r for r in results if r["expected"] == "answer"]
    if not normal:
        raise ValueError("Нет обычных вопросов")
    return {f"Recall@{k}": sum(recall_at_k(r["relevant"], [h["doc_id"] for h in r["retrieved"]], k) for r in normal) / len(normal),
            f"MRR@{k}": sum(reciprocal_rank(r["relevant"], [h["doc_id"] for h in r["retrieved"]], k) for r in normal) / len(normal)}
