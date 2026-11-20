# Backend

FastAPI раздаёт интерфейс и API. Запуск из корня:

```bash
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

- `settings.py`: пути и параметры BM25/Ollama.
- `service.py`: общий RAG-путь для API и benchmark.
- `llm/answer.py`: контекст, prompt, Ollama и проверка ответа.
- `app.py`: маршруты, валидация, CORS и статические файлы.

Без найденного контекста LLM не вызывается. Отказ модели возвращает `no_context`, ошибка сети или формата — 503. Источники строятся из metadata индекса.

[API](../spec/tech/api.md) · [Запуск системы](../README.md#запуск-системы)
