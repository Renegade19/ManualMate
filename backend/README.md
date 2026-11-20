# Backend

FastAPI раздаёт `frontend/` и маршруты `GET /api/vehicles`, `GET /api/health`, `POST /api/ask`. Запуск из корня: `python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000`.

`settings.py` задаёт пути, параметры BM25 и Ollama через переменные окружения. `service.py` объединяет поиск и генерацию и используется также benchmark. `llm/answer.py` отправляет top-k карточек в локальную Ollama, получает JSON и проверяет сноски и числа. Тестовая генерация передаётся в `create_app()` только из тестов; переключателя на заглушку в обычном запуске нет.

При пустой выдаче или score ниже порога LLM не вызывается. При содержательном отказе модели возвращается `no_context`; при ошибке сети, JSON, сносок или чисел — 503. Источники формируются из metadata индекса, не из ответа модели. Вопросы не пишутся в журналы приложения.

Контракт — [api.md](../spec/tech/api.md), архитектура — [architecture.md](../spec/tech/architecture.md), запуск системы — [README](../README.md#запуск-системы). Тесты: `python -m pytest backend/tests`.
