# Контрольная точка 1

## Что требуется показать

Тема и пользователь, основной сценарий, документация, интерфейс или прототип, структура репозитория, распределение работы. В репозитории: README с инструкцией запуска, документы SDD, файлы интерфейса, история изменений в Git. Работающий RAG не требуется.

## Где это в репозитории

| Требование | Где смотреть | Кто показывает | Чем подтвердить |
| --- | --- | --- | --- |
| 01. Тема и пользователь | [README](../README.md#тема-и-пользователь), [product.md](../spec/product/product.md) | Frontend | Объяснить задачу владельца Mercedes-Benz |
| 02. Основной сценарий | [scenarios.md](../spec/product/scenarios.md) S01, [demo-script](demo-script.md) | Frontend | Пройти: автомобиль → вопрос → ответ → источник → фрагмент |
| 03. Документация проекта | [spec/product/](../spec/product/), [spec/tech/](../spec/tech/), [decisions.md](../spec/decisions.md) | Backend, LLM | Архитектура, API, RAG, методика проверки |
| 04. Интерфейс или прототип | [frontend/](../frontend/), [скриншоты](images/) | Frontend | Открыть по README, честно назвать демо-ответ |
| 05. Структура репозитория | [repository-structure.md](repository-structure.md) | Backend | Показать дерево в GitHub |
| 06. Распределение работы | [team.md](../spec/team.md), [plan.md](../spec/plan.md) | Все | Каждый объясняет свою роль и задачи на точку 2 |
| README и инструкция запуска | [README](../README.md#запуск-прототипа) | Backend | Коллега запускает по инструкции |
| Документы SDD | [AGENTS.md](../AGENTS.md), [CONTRIBUTING.md](../CONTRIBUTING.md), [spec/](../spec/) | Backend | Порядок «спецификация → код → проверка» |
| Файлы интерфейса | [frontend/](../frontend/) | Frontend | `index.html`, `styles.css`, `script.js` |
| История изменений в Git | Коммиты, Pull Request, [CHANGE_HISTORY](../CHANGE_HISTORY.md) | Все | История в GitHub |

## Чек-лист перед показом

- [x] Имена участников и роли вписаны в [team.md](../spec/team.md) и README.
- [ ] Команда прочитала и приняла спецификации и API.
- [ ] Каждый участник закоммитил свою часть из своей учётной записи GitHub.
- [ ] Изменения влиты в `main` через Pull Request.
- [ ] `python3 scripts/check_docs.py` проходит, workflow в GitHub Actions зелёный.
- [ ] Прототип открывается по README, сценарии S01–S05, S07–S09 пройдены.
- [ ] Каждый может объяснить путь запроса: интерфейс → backend → BM25 → LLM → ответ с источником.
- [ ] Найден хотя бы один русский PDF руководства, статус обновлён в [sources.md](sources.md).
- [ ] У преподавателя есть доступ к репозиторию.
