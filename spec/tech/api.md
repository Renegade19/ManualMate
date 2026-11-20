# API

FastAPI раздаёт интерфейс и API на одном origin.

## GET /api/vehicles

Возвращает `{ "vehicles": [...] }`. Поля модели: `model_code`, `name`, `body`, `years`, `engines`, `documents`.

В корпусе КТ2 доступны W205 (09/2018), W213 (06/2020), X253 (03/2020), по 10 документов. `engines: []`: документы не размечены по двигателям. Пустой список моделей означает отсутствие доступного корпуса.

## POST /api/ask

```json
{
  "question": "Где находится таблица рекомендованного давления шин?",
  "vehicle": { "model_code": "W213" }
}
```

`question` — непустая строка до 500 символов. `vehicle.model_code` — код из каталога. `vehicle.engine` — необязательный код из `engines` выбранной модели.

### answer

| Поле | Содержимое |
| --- | --- |
| `status` | `answer` |
| `intro` | Вводный текст |
| `points` | Пункты: `text`, `citations` — номера источников |
| `warning` | Примечание либо null |
| `sources` | Найденные документы с metadata и текстом |

У источника обязательны `n`, `chunk_id`, `doc_id`, `title`, `section`, `page`, `score`, `text`; `matched_terms` содержит найденные исходные формы слов для подсветки. `doc_id` и `chunk_id` — D01–D30. `page` — печатная страница. `score` — балл BM25. Сноски указывают только на существующие `sources[].n`.

### clarify

`status: "clarify"`, `message` и непустой `options`. Вариант содержит `label` и `question`. Нажатие варианта отправляет этот вопрос новым запросом.

### no_context

`status: "no_context"`, `message`, `searched`. У проверенного документа: `doc_id`, `title`, `hits`. В КТ2 `hits` — число фрагментов документа в top-k выдаче (0 или 1), не число слов и не score. При отсутствии найденного контекста LLM не вызывается.

### Ошибки

| HTTP | error | Причина |
| --- | --- | --- |
| 400 | `question_invalid` | Неверный запрос или вопрос |
| 404 | `vehicle_unknown` | Неизвестная модель или код двигателя |
| 503 | `service_unavailable` | Индекс или LLM недоступны, ответ модели не прошёл проверку |
| 500 | `internal` | Внутренняя ошибка |

Клиент различает HTTP-ошибку, обрыв соединения, тайм-аут и неверный JSON. При смене автомобиля запрос отменяется. Серверные данные отображаются через `textContent`.

## GET /api/health

Поля: `status` (`ok` / `degraded`), `index_loaded`, `chunks`, `llm` (`available` / `unavailable`), `model`. Для КТ2 загружено 30 документов; модель — `qwen2.5:7b`. Наличие модели в Ollama не гарантирует успешного завершения отдельного запроса.

## Конфигурация

Backend: `OLLAMA_URL`, `OLLAMA_MODEL`, `LLM_TIMEOUT`, `TOP_K`, `BM25_K1`, `BM25_B`, `BM25_MIN_SCORE`. Для отдельного frontend `FRONTEND_ORIGINS` разрешает CORS; по умолчанию `http://localhost:8080` и `http://127.0.0.1:8080`.
