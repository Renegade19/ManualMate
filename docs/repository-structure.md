# Структура репозитория

## Сейчас

| Путь | Содержимое | Ведущий |
| --- | --- | --- |
| `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `CHANGE_HISTORY.md` | Описание и запуск, правила для агента, правила работы, журнал изменений | Все |
| `frontend/` | Прототип интерфейса: `index.html`, `styles.css`, `script.js` | Frontend |
| `spec/product/` | Продукт, сценарии, интерфейс | Frontend |
| `spec/tech/` | Архитектура, API, RAG, способ проверки | Backend, LLM |
| `spec/team.md`, `spec/plan.md`, `spec/decisions.md` | Команда и задачи, план, журнал решений | Все |
| `docs/` | Чек-лист точки, сценарий показа, источники, отчёт проверки | Все |
| `docs/images/` | Скриншоты интерфейса | Frontend |
| `backend/`, `search/` | README с границами будущей реализации | Backend, LLM |
| `corpus/`, `benchmark/` | Формат данных и пример запросов | LLM |
| `scripts/check_docs.py` | Проверка обязательных файлов, ссылок и примера benchmark | Backend |
| `.github/` | Workflow проверки и шаблон Pull Request | Backend |

## При реализации

```text
backend/
├── app.py              FastAPI: /api/ask, /api/vehicles, /api/health
├── llm/answer.py       prompt и вызов Ollama (LLM)
├── requirements.txt
└── tests/
search/
├── preprocess.py       токенизация, лемматизация, синонимы (LLM)
├── index.py            построение и загрузка индекса (Backend)
├── bm25.py             ранжирование (Backend)
└── tests/
corpus/
├── raw/                PDF, не в Git
├── processed/          фрагменты в JSONL
└── manifest.json
benchmark/
├── queries.jsonl       dev и holdout
├── run.py              расчёт Recall@k и MRR
└── reports/            результаты прогонов
```

Пустые папки «для вида» не создаются: пока компонента нет, в его каталоге лежит только README с границами.
