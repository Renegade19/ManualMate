# Backend

Будущий сервис на Python и FastAPI. Реализации пока нет. Отвечает участник с ролью Backend; модуль `llm/` — участник с ролью LLM.

Задачи: принять `POST /api/ask`, проверить ввод и модель, вызвать `preprocess()` и BM25 с фильтром по модели, вернуть `clarify` или `no_context` без вызова LLM, иначе вызвать `generate_answer()` и вернуть ответ с `sources` из metadata фрагментов. Также `GET /api/vehicles` и `GET /api/health`.

Контракт — [spec/tech/api.md](../spec/tech/api.md). Архитектура и интерфейсы модулей — [spec/tech/architecture.md](../spec/tech/architecture.md#контракт-между-модулями).
