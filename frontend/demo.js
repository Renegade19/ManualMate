"use strict";

// Примеры КТ1 используются только при ?demo=1.
window.ManualMateDemo = (() => {
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

function documentsFor(vehicle) {
  return [
    { doc_id: `${vehicle.model_code.toLowerCase()}-manual`, title: `Руководство по эксплуатации ${vehicle.genitive} (${vehicle.model_code})`, scope: `${vehicle.model_code} · руководство` },
    { doc_id: "maintenance-booklet", title: "Сервисная книжка Mercedes-Benz", scope: "все модели" },
    { doc_id: "service-scope", title: "Объём работ сервисов A и B", scope: "все модели" },
    { doc_id: "fluids-spec", title: "Предписания по эксплуатационным материалам", scope: "масла и жидкости" },
  ];
}

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


return { vehicles: VEHICLES.map((v) => ({ ...v, body: v.type })), documentsFor, ask: async (question, vehicle) => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  if (new URLSearchParams(location.search).get("error") === "1") throw new Error("service_unavailable");
  return demoResponse(question, vehicle);
} };
})();
