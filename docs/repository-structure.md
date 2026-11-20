# Структура репозитория

## Сейчас

| Путь | Содержимое | Ведущий |
| --- | --- | --- |
| `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `CHANGE_HISTORY.md` | Описание и запуск, правила для агента, правила работы, журнал изменений | Все |
| `frontend/` | Статический интерфейс, `api.js`, `config.js`, отдельное `demo.js` | Frontend |
| `spec/product/` | Продукт, сценарии, интерфейс | Frontend |
| `spec/tech/` | Архитектура, API, RAG, способ проверки | Backend, LLM |
| `spec/team.md`, `spec/plan.md`, `spec/decisions.md` | Команда и задачи, план, журнал решений | Все |
| `docs/` | Чек-лист точки, сценарий показа, источники, отчёт проверки | Все |
| `docs/images/` | Скриншоты интерфейса | Frontend |
| `backend/`, `search/` | Реализация API, LLM, индекса, BM25 и тесты | Backend, LLM |
| `corpus/`, `benchmark/` | Корпус 30 карточек, 15 вопросов, прогоны и метрики | LLM |
| `scripts/check_docs.py` | Проверка обязательных файлов, ссылок и примера benchmark | Backend |
| `.github/` | Workflow проверки и шаблон Pull Request | Backend |

## Реализация КТ2

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
├── queries.jsonl       10 вопросов и 5 ловушек КТ2
├── run.py              полный прогон поиска и LLM
├── score.py            четыре метрики по сохранённым результатам
└── reports/            результаты прогонов
```

Пустые папки «для вида» не создаются: пока компонента нет, в его каталоге лежит только README с границами.
