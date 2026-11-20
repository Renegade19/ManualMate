"""Общий путь RAG для HTTP API и benchmark."""

from backend.llm.answer import generate_answer
from search.bm25 import search
from search.index import load_index
from search.preprocess import matched_terms, preprocess, query_terms

VEHICLES = [
    {"model_code": "W205", "name": "C-Класс", "body": "Седан", "years": "руководство 09/2018", "engines": []},
    {"model_code": "W213", "name": "E-Класс", "body": "Седан", "years": "руководство 06/2020", "engines": []},
    {"model_code": "X253", "name": "GLC", "body": "Кроссовер", "years": "руководство 03/2020", "engines": []},
]


class RAGService:
    def __init__(self, settings, generator=generate_answer):
        self.settings = settings
        self.index = load_index(settings.corpus, settings.index)
        self.generator = generator

    def vehicles(self):
        return [{**v, "documents": sum(v["model_code"] in d["models"] or "*" in d["models"] for d in self.index.documents.values())} for v in VEHICLES]

    def retrieve(self, question, vehicle):
        return search(self.index, query_terms(question), vehicle["model_code"], top_k=self.settings.top_k,
                      k1=self.settings.k1, b=self.settings.b, engine=vehicle.get("engine"))

    def refusal(self, vehicle, hits):
        return {"status": "no_context", "message": "В документах базы знаний нет ответа на этот вопрос.",
                "searched": [{"doc_id": d["doc_id"], "title": f'{d["section"]} · {d["title"]}',
                              "hits": sum(h["doc_id"] == d["doc_id"] for h in hits)}
                             for d in self.index.documents.values() if vehicle["model_code"] in d["models"] or "*" in d["models"]]}

    def ask(self, question, vehicle):
        terms = set(preprocess(question))
        if "масло" in terms and not terms.intersection({"моторный", "двигатель", "акпп", "коробка"}):
            return {"status": "clarify", "message": "Уточните, о каком масле идёт речь.", "options": [
                {"label": "Моторное масло", "question": "Как безопасно долить моторное масло?"},
                {"label": "Масло в АКПП", "question": "Какое масло нужно для АКПП?"}]}
        hits = self.retrieve(question, vehicle)
        if not hits or hits[0]["score"] < self.settings.min_score:
            return self.refusal(vehicle, hits)
        answer = self.generator(question, vehicle, hits, self.settings)
        if answer.status == "no_context":
            return self.refusal(vehicle, hits)
        terms = query_terms(question)
        sources = [{"n": n, **{k: h[k] for k in ["doc_id", "chunk_id", "title", "section", "page", "text", "score"]},
                    "matched_terms": matched_terms(h["text"], terms)} for n, h in enumerate(hits, 1)]
        return {"status": "answer", "intro": "По найденным разделам руководства:",
                "points": [p.model_dump() for p in answer.points], "warning": "Карточки кратко пересказывают разделы руководства. Сверяйте условия с указанным изданием.", "sources": sources}
