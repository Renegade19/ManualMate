"use strict";

/*
 * ManualMate — прототип интерфейса к контрольной точке 1.
 * Поиск по документации не подключён: askAssistant() возвращает демо-ответ той же
 * формы, что описана в spec/tech/api.md (POST /api/ask). Интервалы, объёмы и допуски
 * в демо-ответах намеренно не приводятся.
 */

const MAX_LENGTH = 500;
const STORAGE_KEY = "manualmate.vehicle";

// Позже загружается с GET /api/vehicles.
const VEHICLES = [
  {
    model_code: "W205",
    name: "C-Класс",
    genitive: "C-Класса",
    type: "Седан",
    years: "2014–2021",
    engines: [
      { code: "M274", label: "M274 — бензин 1.6 / 2.0" },
      { code: "M264", label: "M264 — бензин 1.5 / 2.0" },
      { code: "OM651", label: "OM651 — дизель 2.1" },
      { code: "OM654", label: "OM654 — дизель 2.0" },
    ],
  },
  {
    model_code: "W213",
    name: "E-Класс",
    genitive: "E-Класса",
    type: "Седан",
    years: "2016–2022",
    engines: [
      { code: "M274", label: "M274 — бензин 2.0" },
      { code: "M264", label: "M264 — бензин 2.0" },
      { code: "OM654", label: "OM654 — дизель 2.0" },
      { code: "M256", label: "M256 — бензин 3.0" },
    ],
  },
  {
    model_code: "X253",
    name: "GLC",
    genitive: "GLC",
    type: "Кроссовер",
    years: "2015–2022",
    engines: [
      { code: "M274", label: "M274 — бензин 2.0" },
      { code: "M264", label: "M264 — бензин 2.0" },
      { code: "OM651", label: "OM651 — дизель 2.1" },
      { code: "OM654", label: "OM654 — дизель 2.0" },
    ],
  },
];

// Быстрые темы: частые вопросы и ключевые слова для определения темы вопроса.
const TOPICS = [
  {
    id: "service", title: "Сервис A и B", sub: "ASSYST PLUS", icon: "i-service",
    match: /(сервис|assyst|ассист|(^|[^а-яё])то([^а-яё]|$)|обслуживан)/,
    questions: [
      "Что входит в сервис B?",
      "Что входит в сервис A?",
      "Можно ли пройти сервис раньше срока?",
      "Что будет, если пропустить сервис?",
    ],
  },
  {
    id: "oil", title: "Моторное масло", sub: "допуски, вязкость", icon: "i-oil",
    match: /(масл)/,
    questions: [
      "Какое моторное масло подходит для моего двигателя?",
      "Как проверить уровень моторного масла?",
      "Что означает допуск Mercedes-Benz на канистре?",
    ],
  },
  {
    id: "brakes", title: "Тормоза", sub: "жидкость, колодки", icon: "i-brakes",
    match: /(тормоз|колодк|диск)/,
    questions: [
      "Какая тормозная жидкость нужна?",
      "Когда менять тормозную жидкость?",
      "Как понять, что пора менять колодки?",
    ],
  },
  {
    id: "tyres", title: "Шины и давление", sub: "таблица давления", icon: "i-tyres",
    match: /(шин|давлен|колес|колёс|резин)/,
    questions: [
      "Какое давление должно быть в шинах?",
      "Где найти таблицу давления в шинах?",
      "Как сбросить предупреждение о давлении в шинах?",
    ],
  },
  {
    id: "cooling", title: "Охлаждение", sub: "антифриз", icon: "i-cooling",
    match: /(охлажд|антифриз|тосол|радиатор)/,
    questions: [
      "Какую охлаждающую жидкость заливать?",
      "Как проверить уровень охлаждающей жидкости?",
      "Можно ли доливать воду в систему охлаждения?",
    ],
  },
  {
    id: "messages", title: "Сообщения", sub: "на панели приборов", icon: "i-messages",
    match: /(панел|сообщени|лампа|загорел|горит|ключ|значок|индикатор)/,
    questions: [
      "Что означает гаечный ключ на панели приборов?",
      "Как сбросить сообщение ASSYST PLUS после сервиса?",
      "Что делать, если горит контрольная лампа давления масла?",
    ],
  },
];

const $ = (id) => document.getElementById(id);

const ui = {
  modelTabs: $("model-tabs"),
  engine: $("engine-select"),
  name: $("vehicle-name"),
  meta: $("vehicle-meta"),
  topics: $("topics"),
  topicTitle: $("topic-title"),
  topicQuestions: $("topic-questions"),
  kbList: $("kb-list"),
  form: $("ask-form"),
  question: $("question"),
  submit: $("ask-submit"),
  counter: $("ask-counter"),
  result: $("result"),
};

const state = { vehicle: null, topic: TOPICS[0], busy: false, lastQuestion: "" };

/* ---------- DOM-помощник: весь текст выводится через textContent ---------- */

function el(tag, props, children) {
  const node = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children || [])) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function icon(id) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#${id}`);
  svg.append(use);
  return svg;
}

/* ---------- Хранилище выбора (может быть недоступно) ---------- */

function loadSelection() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

function saveSelection(selection) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch {
    /* без сохранения — не критично */
  }
}

/* ---------- Документы базы знаний (демо) ---------- */

function documentsFor(vehicle) {
  return [
    { doc_id: `${vehicle.model_code.toLowerCase()}-manual`, title: `Руководство по эксплуатации ${vehicle.genitive} (${vehicle.model_code})`, scope: `${vehicle.model_code} · руководство` },
    { doc_id: "maintenance-booklet", title: "Сервисная книжка Mercedes-Benz", scope: "все модели" },
    { doc_id: "service-scope", title: "Объём работ сервисов A и B", scope: "все модели" },
    { doc_id: "fluids-spec", title: "Предписания по эксплуатационным материалам", scope: "масла и жидкости" },
  ];
}

/* ---------- Модель и двигатель ---------- */

function renderModelTabs() {
  ui.modelTabs.replaceChildren(...VEHICLES.map((v) =>
    el("button", { type: "button", class: "model-tab", "data-model": v.model_code, "aria-pressed": "false", onclick: () => onModelChange(v.model_code) }, [
      v.name,
      el("small", { text: v.model_code }),
    ]),
  ));
}

function selectVehicle(modelCode, engineCode) {
  const vehicle = VEHICLES.find((v) => v.model_code === modelCode) || VEHICLES[1];
  for (const tab of ui.modelTabs.children) {
    tab.setAttribute("aria-pressed", String(tab.dataset.model === vehicle.model_code));
  }

  ui.engine.replaceChildren(...vehicle.engines.map((e) => el("option", { value: e.code, text: e.label })));
  const engine = vehicle.engines.find((e) => e.code === engineCode) || vehicle.engines[0];
  ui.engine.value = engine.code;

  state.vehicle = { ...vehicle, engine };
  ui.name.textContent = vehicle.name;
  ui.meta.textContent = `${vehicle.type} · кузов ${vehicle.model_code} · ${vehicle.years}`;
  document.title = `ManualMate — ${vehicle.name} ${vehicle.model_code}`;

  ui.kbList.replaceChildren(...documentsFor(vehicle).map((d) => el("li", {}, [d.title, el("span", { text: d.scope })])));

  saveSelection({ model_code: vehicle.model_code, engine: engine.code });
}

function onModelChange(modelCode) {
  if (state.vehicle && state.vehicle.model_code === modelCode) return;
  selectVehicle(modelCode);
  if (!state.busy) renderEmpty();
}

/* ---------- Темы ---------- */

function renderTopics() {
  ui.topics.replaceChildren(...TOPICS.map((t) =>
    el("button", { type: "button", class: "topic", "data-topic": t.id, "aria-pressed": "false", onclick: () => selectTopic(t) }, [
      icon(t.icon),
      el("b", { text: t.title }),
      el("span", { text: t.sub }),
    ]),
  ));
}

function selectTopic(topic) {
  state.topic = topic;
  for (const button of ui.topics.children) {
    button.setAttribute("aria-pressed", String(button.dataset.topic === topic.id));
  }
  ui.topicTitle.textContent = `Частые вопросы · ${topic.title}`;
  ui.topicQuestions.replaceChildren(...topic.questions.map((q) =>
    el("li", {}, [el("button", { type: "button", onclick: () => submitQuestion(q) }, [q, el("span", { text: "→", "aria-hidden": "true" })])]),
  ));
}

function topicFor(question) {
  const q = question.toLowerCase();
  return TOPICS.find((t) => t.questions.includes(question)) || TOPICS.find((t) => t.match.test(q)) || null;
}

/* ---------- Демо-ответы (заменяются запросом к backend) ---------- */

const AMBIGUOUS = /(масл|жидкост|фильтр|свеч)/;
const QUALIFIERS = /(мотор|двигател|акпп|коробк|автомат|тормоз|охлажд|антифриз|воздуш|салон|топлив|зажиган|накал)/;
const OUT_OF_SCOPE = /(стоит|стоимост|цен[аыу]|купить|заказать|запис|дилер[а-я]* рядом|погод|страхов|штраф)/;

function demoResponse(question, vehicle) {
  const q = question.toLowerCase();
  const docs = documentsFor(vehicle);

  if (OUT_OF_SCOPE.test(q)) {
    return {
      status: "no_context",
      message: "В руководстве, сервисной книжке и предписаниях по материалам нет сведений по этому вопросу. Ответ без подтверждения в документации не составляется.",
      searched: docs.map((d) => ({ doc_id: d.doc_id, title: d.title, hits: 0 })),
    };
  }

  if (AMBIGUOUS.test(q) && !QUALIFIERS.test(q)) {
    return {
      status: "clarify",
      message: "В документации это разные разделы, и ответ зависит от узла автомобиля. Выберите, что именно вас интересует.",
      options: q.includes("фильтр")
        ? [
          { label: "Масляный фильтр", question: "Когда менять масляный фильтр?" },
          { label: "Воздушный фильтр двигателя", question: "Когда менять воздушный фильтр двигателя?" },
          { label: "Фильтр салона", question: "Когда менять фильтр салона?" },
        ]
        : [
          { label: "Моторное масло", question: "Какое моторное масло подходит для моего двигателя?" },
          { label: "Масло в АКПП", question: "Какое масло заливается в АКПП?" },
          { label: "Тормозная жидкость", question: "Какая тормозная жидкость нужна?" },
        ],
    };
  }

  const name = `${vehicle.genitive} (${vehicle.model_code}) с двигателем ${vehicle.engine.code}`;
  const sources = [
    {
      n: 1, doc_id: docs[0].doc_id, title: docs[0].title,
      section: "Техническое обслуживание · Индикация ASSYST PLUS", page: 386, score: 8.41,
      text: "[Пример фрагмента] Система ASSYST PLUS показывает на дисплее комбинации приборов, какой сервис предстоит и через сколько дней или километров его нужно пройти. Сервис A и сервис B чередуются.",
    },
    {
      n: 2, doc_id: docs[1].doc_id, title: docs[1].title,
      section: "Порядок прохождения сервиса", page: 6, score: 6.97,
      text: "[Пример фрагмента] Срок сервиса определяется тем условием, которое наступит раньше: пробегом или временем, указанным в сообщении ASSYST PLUS. Отметка о прохождении сервиса вносится в сервисную книжку.",
    },
    {
      n: 3, doc_id: docs[2].doc_id, title: docs[2].title,
      section: "Сервис B · Перечень работ", page: 4, score: 5.12,
      text: "[Пример фрагмента] Сервис B включает работы сервиса A и дополнительные проверки и замены. Перечень зависит от модели, двигателя и пробега автомобиля.",
    },
  ];

  if (/масл/.test(q) && /(мотор|двигател)/.test(q)) {
    sources[2] = {
      n: 3, doc_id: docs[3].doc_id, title: docs[3].title,
      section: `Моторные масла · двигатель ${vehicle.engine.code}`, page: 12, score: 7.36,
      text: `[Пример фрагмента] Для двигателя ${vehicle.engine.code} допускаются только моторные масла с допуском Mercedes-Benz, указанным в предписаниях по эксплуатационным материалам. Вязкость выбирается по таблице для климатических условий.`,
    };
    return {
      status: "answer",
      intro: `Для ${name} подходит только моторное масло с допуском Mercedes-Benz, предусмотренным для этого двигателя. Маркировка вязкости без допуска не гарантирует соответствия.`,
      points: [
        { text: "Найдите допуск для своего двигателя в предписаниях по эксплуатационным материалам и проверьте его на канистре.", citations: [3] },
        { text: "Вязкость выбирается по таблице в зависимости от температуры окружающего воздуха.", citations: [3] },
        { text: "Замена масла выполняется в рамках сервиса A или B по сообщению ASSYST PLUS.", citations: [1, 2] },
      ],
      warning: "Номер допуска, вязкость и объём не указаны, пока исходные документы не проверены.",
      sources,
    };
  }

  if (!/(сервис|assyst|ассист|(^|[^а-яё])то([^а-яё]|$)|обслуживан|ключ)/.test(q)) {
    return {
      status: "answer",
      intro: `Так будет выглядеть ответ для ${name}. Сведения по этому вопросу появятся после подключения поиска по документации.`,
      points: [
        { text: "Поиск выполняется по руководству по эксплуатации, сервисной книжке и предписаниям по материалам выбранной модели.", citations: [1] },
        { text: "Каждое утверждение в ответе сопровождается ссылкой на документ и страницу.", citations: [2] },
        { text: "Если сведений в документации нет, справочник сообщает об этом и не составляет ответ.", citations: [3] },
      ],
      warning: "Источники ниже — те же примеры, что и для вопросов о сервисе A и B.",
      sources,
    };
  }

  return {
    status: "answer",
    intro: `Для ${name} сроки и объём обслуживания определяет система ASSYST PLUS: она заранее сообщает, какой сервис предстоит — A или B.`,
    points: [
      { text: "Проверьте сообщение ASSYST PLUS на панели приборов: там указан вид сервиса и оставшийся срок или пробег.", citations: [1] },
      { text: "Сервис проходят по тому условию, которое наступит раньше: пробег или время.", citations: [2] },
      { text: "Сервис B включает работы сервиса A и дополнительные позиции по документу об объёме работ.", citations: [3] },
    ],
    warning: "Перечень работ и интервалы не указаны, пока исходные документы не проверены.",
    sources,
  };
}

/**
 * Единственная точка подключения к backend.
 * Рабочая версия: POST /api/ask { question, vehicle: { model_code, engine } }.
 */
async function askAssistant(question, vehicle) {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  if (new URLSearchParams(location.search).has("error")) {
    throw new Error("service_unavailable");
  }
  return demoResponse(question, vehicle);
}

/* ---------- Подсветка терминов (демо: совпадение начала слова) ---------- */

const STOP_WORDS = new Set(["что", "как", "какой", "какое", "какая", "какие", "для", "мой", "моего", "моей", "где", "когда", "это", "или", "на", "в", "по", "нужно", "надо"]);

function queryStems(question) {
  return question
    .toLowerCase()
    .split(/[^a-zа-яё0-9-]+/i)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
    .map((w) => (w.length >= 6 ? w.slice(0, 5) : w.length >= 4 ? w.slice(0, 4) : w));
}

function highlighted(text, stems) {
  const p = el("p");
  for (const part of text.split(/([a-zа-яё0-9-]+)/i)) {
    const lower = part.toLowerCase();
    const hit = part && stems.some((s) => lower.startsWith(s));
    p.append(hit ? el("mark", { text: part }) : document.createTextNode(part));
  }
  return p;
}

/* ---------- Состояния результата ---------- */

function head(overline, question, opts = {}) {
  return [
    el("div", { class: "result-head" }, [
      el("p", { class: "overline" }, [overline, opts.demo ? el("span", { class: "demo-mark", text: "Пример" }) : null]),
      opts.reset === false ? null : el("button", { type: "button", class: "link-btn", text: "Новый вопрос", onclick: resetQuestion }),
    ]),
    el("h2", { class: "question serif", text: question }),
  ];
}

function renderEmpty() {
  ui.result.replaceChildren(
    el("div", { class: "empty" }, [
      ...head(`${state.vehicle.name} · ${state.vehicle.model_code}`, "Задайте вопрос или выберите тему", { reset: false }),
      el("p", { text: "Ответы составляются только по документации выбранной модели. У каждого утверждения — ссылка на документ и страницу, а исходный фрагмент можно открыть прямо под ответом." }),
    ]),
  );
}

function renderLoading(question) {
  ui.result.replaceChildren(
    el("div", {}, [
      ...head(`Поиск по документации ${state.vehicle.genitive}`, question, { reset: false }),
      el("div", { class: "progress", role: "progressbar", "aria-label": "Идёт поиск" }),
      el("p", { class: "progress-text", text: "Подбираем разделы руководства и сервисных документов…" }),
    ]),
  );
}

function toggleFragment(n, open) {
  const fragment = document.getElementById(`fragment-${n}`);
  const button = document.getElementById(`fragment-btn-${n}`);
  if (!fragment || !button) return;
  const show = open === undefined ? fragment.hidden : open;
  fragment.hidden = !show;
  button.textContent = show ? "Скрыть фрагмент ▴" : "Показать фрагмент ▾";
  button.setAttribute("aria-expanded", String(show));
  return fragment;
}

function focusSource(n) {
  const fragment = toggleFragment(n, true);
  if (!fragment) return;
  document.querySelectorAll(".fragment.focused").forEach((f) => f.classList.remove("focused"));
  fragment.classList.add("focused");
  document.getElementById(`source-${n}`).scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderAnswer(question, data, topic) {
  const stems = queryStems(question);
  const label = topic ? `${topic.title} · ответ по документации` : "Ответ по документации";

  ui.result.replaceChildren(
    el("article", {}, [
      ...head(label, question, { demo: true }),
      el("p", { class: "lede", text: data.intro }),
      el("ol", { class: "points" }, data.points.map((p) =>
        el("li", {}, [p.text, ...p.citations.map((n) =>
          el("button", { type: "button", class: "cite", text: n, "aria-label": `Источник ${n}`, onclick: () => focusSource(n) }),
        )]),
      )),
      data.warning ? el("p", { class: "note", text: data.warning }) : null,
      el("h3", { class: "overline block-title", text: "Источники" }),
      el("ol", { class: "sources" }, data.sources.map((s) =>
        el("li", { class: "source", id: `source-${s.n}` }, [
          el("div", { class: "source-row" }, [
            el("b", { text: s.n }),
            el("div", {}, [s.title, el("span", { class: "sub", text: s.section })]),
            el("span", { text: `стр. ${s.page}` }),
            el("button", { type: "button", class: "link-btn", id: `fragment-btn-${s.n}`, "aria-expanded": "false", "aria-controls": `fragment-${s.n}`, text: "Показать фрагмент ▾", onclick: () => toggleFragment(s.n) }),
          ]),
          el("div", { class: "fragment", id: `fragment-${s.n}`, hidden: "" }, [
            highlighted(s.text, stems),
            el("p", { class: "meta", text: `${s.title}, стр. ${s.page} · оценка BM25 ${s.score.toFixed(2)} · выделены слова запроса` }),
          ]),
        ]),
      )),
    ]),
  );
}

function renderClarify(question, data) {
  ui.result.replaceChildren(
    el("div", {}, [
      ...head("Требуется уточнение", question),
      el("p", { class: "lede", text: data.message }),
      el("div", { class: "options" }, data.options.map((option) =>
        el("button", { type: "button", class: "option", text: `${option.label} →`, onclick: () => submitQuestion(option.question) }),
      )),
    ]),
  );
}

function renderNoContext(question, data) {
  ui.result.replaceChildren(
    el("div", {}, [
      ...head("Ответ не найден", question),
      el("p", { class: "lede", text: data.message }),
      el("h3", { class: "overline block-title", text: "Проверенные документы" }),
      el("ul", { class: "checked" }, data.searched.map((d) =>
        el("li", {}, [el("span", { text: d.title }), el("span", { text: `${d.hits} совпадений` })]),
      )),
      el("h3", { class: "overline block-title", text: `Есть в документации · ${state.topic.title}` }),
      el("div", { class: "options" }, state.topic.questions.slice(0, 3).map((q) =>
        el("button", { type: "button", class: "option", text: q, onclick: () => submitQuestion(q) }),
      )),
    ]),
  );
}

function renderError(question) {
  ui.result.replaceChildren(
    el("div", { class: "error", role: "alert" }, [
      ...head("Ошибка соединения", question),
      el("p", { class: "lede", text: "Не удалось получить ответ. Проверьте подключение к серверу и попробуйте ещё раз." }),
      el("button", { type: "button", class: "option", text: "Повторить", onclick: () => submitQuestion(question) }),
    ]),
  );
}

/* ---------- Отправка вопроса ---------- */

async function submitQuestion(raw) {
  const question = raw.trim();
  if (!question || question.length > MAX_LENGTH || state.busy) return;

  const topic = topicFor(question);
  if (topic && topic !== state.topic) selectTopic(topic);

  ui.question.value = question;
  state.busy = true;
  state.lastQuestion = question;
  updateCounter();
  renderLoading(question);

  try {
    const data = await askAssistant(question, state.vehicle);
    if (data.status === "clarify") renderClarify(question, data);
    else if (data.status === "no_context") renderNoContext(question, data);
    else renderAnswer(question, data, topic);
  } catch {
    renderError(question);
  } finally {
    state.busy = false;
    updateCounter();
  }
}

function resetQuestion() {
  ui.question.value = "";
  state.lastQuestion = "";
  updateCounter();
  renderEmpty();
  ui.question.focus();
}

function updateCounter() {
  const length = ui.question.value.length;
  ui.counter.textContent = `${length} / ${MAX_LENGTH}`;
  ui.counter.classList.toggle("over", length >= MAX_LENGTH);
  ui.submit.disabled = state.busy || ui.question.value.trim() === "";
  ui.question.style.height = "auto";
  ui.question.style.height = `${Math.min(ui.question.scrollHeight + 2, 200)}px`;
}

/* ---------- Инициализация ---------- */

function init() {
  renderModelTabs();
  renderTopics();
  const saved = loadSelection();
  selectVehicle(saved && saved.model_code, saved && saved.engine);
  selectTopic(TOPICS[0]);

  ui.engine.addEventListener("change", () => selectVehicle(state.vehicle.model_code, ui.engine.value));

  ui.form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitQuestion(ui.question.value);
  });
  ui.question.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      submitQuestion(ui.question.value);
    }
  });
  ui.question.addEventListener("input", updateCounter);

  updateCounter();
  renderEmpty();
}

init();
