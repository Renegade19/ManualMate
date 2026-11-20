"use strict";

// ManualMate — интерфейс справочника. Контракт: spec/tech/api.md.
const MAX_LENGTH = 500;
const STORAGE_KEY = "manualmate.vehicle";
const DEMO_MODE = new URLSearchParams(location.search).get("demo") === "1";
let vehicles = [];

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
  kbNote: $("kb-note"),
  form: $("ask-form"),
  question: $("question"),
  submit: $("ask-submit"),
  counter: $("ask-counter"),
  result: $("result"),
};

const state = { vehicle: null, topic: TOPICS[0], ready: false, busy: false, request: null, requestId: 0 };

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

/* ---------- Модель и двигатель ---------- */

function renderModelTabs() {
  ui.modelTabs.replaceChildren(...vehicles.map((v) =>
    el("button", { type: "button", class: "model-tab", "data-model": v.model_code, "aria-pressed": "false", onclick: () => onModelChange(v.model_code) }, [
      v.name,
      el("small", { text: v.model_code }),
    ]),
  ));
}

function selectVehicle(modelCode, engineCode) {
  const vehicle = vehicles.find((v) => v.model_code === modelCode) || vehicles.find((v) => v.model_code === "W213") || vehicles[0];
  for (const tab of ui.modelTabs.children) tab.setAttribute("aria-pressed", String(tab.dataset.model === vehicle.model_code));
  ui.engine.replaceChildren(el("option", { value: "", text: "Не указан" }), ...vehicle.engines.map((e) => el("option", { value: e.code, text: e.label })));
  const engine = vehicle.engines.find((e) => e.code === engineCode) || null;
  ui.engine.value = engine?.code || "";
  // Старый прототип использует родительный падеж и обязательный двигатель.
  state.vehicle = { ...vehicle, engine: DEMO_MODE ? engine || vehicle.engines[0] : engine };
  if (DEMO_MODE) ui.engine.value = state.vehicle.engine.code;
  ui.name.textContent = vehicle.name;
  ui.meta.textContent = `${vehicle.body} · кузов ${vehicle.model_code} · ${vehicle.years}`;
  document.title = `ManualMate — ${vehicle.name} ${vehicle.model_code}`;
  ui.kbList.replaceChildren(...(DEMO_MODE
    ? window.ManualMateDemo.documentsFor(vehicle).map((d) => el("li", {}, [d.title, el("span", { text: d.scope })]))
    : [el("li", { text: vehicle.documents === undefined ? "Состав базы уточняется" : `Документов: ${vehicle.documents}` })]));
  ui.kbNote.textContent = DEMO_MODE
    ? "Демонстрационные данные. Разделы, страницы и фрагменты являются примерами."
    : "Источники и фрагменты появятся под ответом. Используется издание руководства, указанное выше.";
  saveSelection({ model_code: vehicle.model_code, engine: state.vehicle.engine?.code || "" });
}

function cancelQuestion() {
  state.request?.abort();
  state.request = null;
  state.requestId += 1;
  state.busy = false;
  ui.result.setAttribute("aria-busy", "false");
}

function onModelChange(modelCode) {
  if (state.vehicle?.model_code === modelCode) return;
  cancelQuestion();
  selectVehicle(modelCode);
  renderEmpty();
  updateCounter();
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

/* ---------- API и подсветка исходных терминов ---------- */

async function askAssistant(question, vehicle, signal) {
  if (DEMO_MODE) return window.ManualMateDemo.ask(question, vehicle);
  return window.ManualMateAPI.ask(question, vehicle, signal);
}

function highlighted(text, terms) {
  const p = el("p");
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const alternatives = [...new Set(terms)].sort((a, b) => b.length - a.length).map(escape);
  if (!alternatives.length) { p.textContent = text; return p; }
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join("|")})(?![\\p{L}\\p{N}])`, "giu");
  let start = 0;
  for (const match of text.matchAll(pattern)) {
    p.append(document.createTextNode(text.slice(start, match.index)), el("mark", { text: match[0] }));
    start = match.index + match[0].length;
  }
  p.append(document.createTextNode(text.slice(start)));
  return p;
}

/* ---------- Состояния результата ---------- */

function head(overline, question, opts = {}) {
  return [
    el("div", { class: "result-head" }, [
      el("p", { class: "overline" }, [overline, DEMO_MODE ? el("span", { class: "demo-mark", text: "Пример" }) : null]),
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
      ...head(`Поиск по документации ${state.vehicle.name}`, question, { reset: false }),
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
  const label = topic ? `${topic.title} · ответ по документации` : "Ответ по документации";

  ui.result.replaceChildren(
    el("article", {}, [
      ...head(label, question),
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
            highlighted(s.text, s.matched_terms || []),
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
        el("li", {}, [el("span", { text: d.title }), el("span", { text: `В выдаче: ${d.hits}` })]),
      )),
      el("h3", { class: "overline block-title", text: `Другие вопросы · ${state.topic.title}` }),
      el("div", { class: "options" }, state.topic.questions.slice(0, 3).map((q) =>
        el("button", { type: "button", class: "option", text: q, onclick: () => submitQuestion(q) }),
      )),
    ]),
  );
}

const ERROR_MESSAGES = {
  question_invalid: "Вопрос должен содержать от 1 до 500 символов. Проверьте текст и отправьте его снова.",
  vehicle_unknown: "Выбранный автомобиль недоступен. Обновите список моделей и повторите вопрос.",
  service_unavailable: "Сервис временно недоступен. Повторите запрос позже.",
  invalid_response: "Сервер вернул ответ в неподдерживаемом формате. Попробуйте ещё раз.",
  timeout: "Сервер не ответил вовремя. Попробуйте ещё раз.",
  internal: "На сервере произошла ошибка. Попробуйте ещё раз.",
};

function renderError(question, error, catalog = false) {
  ui.result.replaceChildren(el("div", { class: "error", role: "alert" }, [
    ...head(catalog ? "Список автомобилей недоступен" : "Ошибка запроса", question, { reset: !catalog }),
    el("p", { class: "lede", text: ERROR_MESSAGES[error.code || error.message] || "Не удалось соединиться с сервером. Проверьте подключение и повторите запрос." }),
    el("button", { type: "button", class: "option", text: "Повторить", onclick: () => catalog ? loadVehicles() : submitQuestion(question) }),
    !catalog && error.code === "vehicle_unknown" ? el("button", { type: "button", class: "option", text: "Обновить модели", onclick: loadVehicles }) : null,
  ]));
}

/* ---------- Отправка вопроса ---------- */

async function submitQuestion(raw) {
  const question = raw.trim();
  if (!question || question.length > MAX_LENGTH || state.busy || !state.ready) return;
  const topic = topicFor(question);
  if (topic && topic !== state.topic) selectTopic(topic);
  ui.question.value = question;
  const request = new AbortController();
  const id = ++state.requestId;
  state.request = request;
  state.busy = true;
  ui.result.setAttribute("aria-busy", "true");
  updateCounter();
  renderLoading(question);
  try {
    const data = await askAssistant(question, state.vehicle, request.signal);
    if (id !== state.requestId) return;
    if (data.status === "clarify") renderClarify(question, data);
    else if (data.status === "no_context") renderNoContext(question, data);
    else renderAnswer(question, data, topic);
  } catch (error) {
    if (id === state.requestId && error.name !== "AbortError") renderError(question, error);
  } finally {
    if (id === state.requestId) {
      state.busy = false;
      state.request = null;
      ui.result.setAttribute("aria-busy", "false");
      updateCounter();
    }
  }
}

function resetQuestion() {
  cancelQuestion();
  ui.question.value = "";
  updateCounter();
  renderEmpty();
  ui.question.focus();
}

function updateCounter() {
  const length = ui.question.value.length;
  ui.counter.textContent = `${length} / ${MAX_LENGTH}`;
  ui.counter.classList.toggle("over", length >= MAX_LENGTH);
  ui.submit.disabled = !state.ready || state.busy || length > MAX_LENGTH || ui.question.value.trim() === "";
  ui.question.style.height = "auto";
  ui.question.style.height = `${Math.min(ui.question.scrollHeight + 2, 200)}px`;
}

/* ---------- Инициализация ---------- */

async function loadVehicles() {
  cancelQuestion();
  state.ready = false;
  ui.engine.disabled = true;
  ui.modelTabs.replaceChildren();
  ui.result.replaceChildren(el("p", { class: "progress-text", text: "Загружаем список автомобилей…" }));
  updateCounter();
  try {
    vehicles = DEMO_MODE ? window.ManualMateDemo.vehicles : await window.ManualMateAPI.vehicles();
    if (!vehicles.length) {
      ui.name.textContent = "Mercedes-Benz";
      ui.meta.textContent = "";
      ui.kbList.replaceChildren();
      ui.result.replaceChildren(el("p", { text: "В базе пока нет доступных автомобилей." }));
      return;
    }
    renderModelTabs();
    const saved = loadSelection();
    selectVehicle(saved?.model_code, saved?.engine);
    state.ready = true;
    ui.engine.disabled = false;
    renderEmpty();
  } catch (error) {
    renderError("Не удалось загрузить автомобили", error, true);
  } finally { updateCounter(); }
}

function init() {
  $("demo-tag").hidden = !DEMO_MODE;
  renderTopics();
  selectTopic(TOPICS[0]);
  ui.engine.addEventListener("change", () => {
    cancelQuestion();
    selectVehicle(state.vehicle.model_code, ui.engine.value);
    renderEmpty();
    updateCounter();
  });
  ui.form.addEventListener("submit", (event) => { event.preventDefault(); submitQuestion(ui.question.value); });
  ui.question.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      submitQuestion(ui.question.value);
    }
  });
  ui.question.addEventListener("input", updateCounter);
  window.addEventListener("resize", updateCounter);
  loadVehicles();
}

init();
