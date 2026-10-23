# Совместная работа

## Порядок работы (SDD)

Сначала фиксируем поведение и способ проверки, потом пишем код:

Задача → ветка → спецификация → код → проверки → Pull Request → review коллегой → merge в `main`.

Если меняется API — в том же PR обновляется [spec/tech/api.md](spec/tech/api.md) и код всех потребителей. Если меняется технология — новая строка в [журнале решений](spec/decisions.md).

## Ветки

`main` — единственная постоянная ветка. Под каждую задачу создаётся короткая ветка:

| Префикс | Когда | Пример |
| --- | --- | --- |
| `feat/` | Новая функциональность | `feat/bm25-index` |
| `fix/` | Исправление ошибки | `fix/model-filter` |
| `docs/` | Документация и спецификации | `docs/corpus-sources` |
| `chore/` | CI, зависимости, инфраструктура | `chore/docs-check` |

## Одна задача от начала до конца

```bash
git switch main
git pull --ff-only
git switch -c docs/corpus-sources
# ... правки ...
python3 scripts/check_docs.py
git add spec/tech/rag.md docs/sources.md
git commit -m "docs: list candidate sources for W213"
git push -u origin HEAD
```

На GitHub открыть Pull Request в `main`, заполнить шаблон и попросить review другого участника. После merge удалить ветку.

## Сообщения коммитов

Формат `тип: что изменилось`, где тип — `feat`, `fix`, `docs`, `chore`, `refactor`, `test`. Например: `feat: add BM25 scoring`, `docs: describe service A/B scenario`.

## Зоны ответственности

| Каталог | Ведущий |
| --- | --- |
| `frontend/`, `spec/product/` | Frontend |
| `backend/`, `search/index.py`, `search/bm25.py`, `spec/tech/api.md`, `spec/tech/architecture.md`, `.github/`, `scripts/` | Backend |
| `corpus/`, `search/preprocess.py`, `backend/llm/`, `benchmark/`, `spec/tech/rag.md`, `spec/tech/testing.md` | LLM |
| `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `CHANGE_HISTORY.md`, `spec/plan.md` | Общие, по согласованию |

Состав команды — [spec/team.md](spec/team.md).

## Review

Проверяющий смотрит: соответствует ли изменение задаче и спецификации, нет ли секретов, проходят ли проверки. Свой PR автор не одобряет сам.

## Когда изменение готово

- Спецификация и код согласованы.
- `python3 scripts/check_docs.py` проходит.
- Если менялся интерфейс — основной сценарий пройден в браузере на ноутбуке и на ширине телефона.
- README и [CHANGE_HISTORY.md](CHANGE_HISTORY.md) обновлены при необходимости.
- В PR честно написано, что не проверено. Результаты тестов и benchmark не выдумываются.
