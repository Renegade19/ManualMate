# Источники

## Проверенные источники КТ2

Дата проверки: 2026-11-20. Русские PDF получены из [каталога руководств МБ РУС](https://mbrus.ru/being-an-owner/catalog-of-technical-accessories/instruction-manuals). Названия, издания, прямые ссылки и SHA-256 — в [corpus/manifest.json](../corpus/manifest.json). Исходные PDF сохраняются локально и не публикуются.

| ID | Руководство | Издание | Использование |
| --- | --- | --- | --- |
| `w205-manual` | C-класс седан W205, COMAND | 09/2018 | Карточки D01–D10 |
| `w213-manual` | E-класс седан W213, MBUX | 06/2020 | Карточки D11–D20 |
| `x253-manual` | GLC X253, MBUX | 03/2020 | Карточки D21–D30 |

Каждая карточка связана с печатной страницей, PDF-страницей и якорем текста; подготовка воспроизводится через `python scripts/prepare_corpus.py --download`. Сверялись исходные страницы разделов ASSYST PLUS, моторного масла, давления шин и предупреждений при проверке охлаждающей жидкости. Карточки — короткие пересказы, не дословное извлечение и не замена полному руководству.

**Не включены:** сервисная книжка, отдельный перечень работ A/B и справочник MB-BeVo. Их прежний статус «ищем» не даёт права подставлять допуски, интервалы или перечни работ в рабочие ответы. Поиск и benchmark используют только 30 карточек текущего корпуса.

**Права:** оригинальные руководства защищены авторским правом. В Git нет полных PDF и полного извлечённого текста; сохраняются ссылки, хеши и краткие адаптированные карточки с указанием источников.

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
