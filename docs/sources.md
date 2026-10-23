# Источники

## Корпус: кандидаты

Статус каждого документа фиксируется здесь, после проверки — в `corpus/manifest.json`. Документ попадает в корпус, только если он на русском, относится к нужной модели и из него извлекается текст с номерами страниц.

| ID | Документ | Модели | Где искать | Статус |
| --- | --- | --- | --- | --- |
| `w205-manual` | Руководство по эксплуатации C-класса, седан (W205) | W205 | Официальные руководства Mercedes-Benz (онлайн-версия и PDF), бортовая версия в автомобиле, архивы владельцев | Ищем |
| `w213-manual` | Руководство по эксплуатации E-класса, седан (W213) | W213 | То же | Ищем |
| `x253-manual` | Руководство по эксплуатации GLC (X253) | X253 | То же | Ищем |
| `maintenance-booklet` | Сервисная книжка Mercedes-Benz | Все | Официальный дилер, архивы владельцев | Ищем |
| `service-scope` | Объём работ сервисов A и B, дополнительные работы | Все | Материалы официального сервиса | Ищем |
| `fluids-spec` | Предписания Mercedes-Benz по эксплуатационным материалам (MB-BeVo): моторные масла, тормозная и охлаждающая жидкость | Все, с привязкой к двигателям | Официальный справочник MB-BeVo; проверить наличие русской версии | Ищем |

**План Б.** Если для одной из моделей не найдётся русского руководства, она заменяется моделью с теми же двигателями (CLA C117 или GLE W166), а решение записывается в [журнал решений](../spec/decisions.md).

**Права.** Руководства защищены авторским правом. В репозиторий не загружаются исходные PDF, только `manifest.json` (название, источник, хеш) и тексты, необходимые для учебных экспериментов, хранятся локально.

## Методы

- Методические указания к НИРС (ОАД), МГТУ им. Н. Э. Баумана, кафедра ИУ5, 2026 — BM25, Recall@k, MRR.
- Robertson S., Zaragoza H. The Probabilistic Relevance Framework: BM25 and Beyond. Foundations and Trends in Information Retrieval, 2009.
- Manning C., Raghavan P., Schütze H. Introduction to Information Retrieval. Cambridge University Press, 2008.
- Lewis P. et al. Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. NeurIPS, 2020.

## Технологии

- pymorphy3 (лемматизация): https://github.com/no-plagiarism/pymorphy3
- FastAPI: https://fastapi.tiangolo.com/
- Ollama: https://ollama.com/
- pypdf: https://pypdf.readthedocs.io/
- pdfplumber: https://github.com/jsvine/pdfplumber
