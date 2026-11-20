/* Браузерные проверки API-клиента. Тестовые ответы не являются результатом RAG. */
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.TEST_PORT || 18765);
const base = `http://127.0.0.1:${port}`;
const python = process.env.PYTHON || "python3";
const server = spawn(python, ["-m", "uvicorn", "backend.app:app", "--host", "127.0.0.1", "--port", String(port)], { cwd: root, stdio: "pipe" });
let logs = "";
server.stderr.on("data", (d) => { logs += d; });
const answer = {
  status: "answer", intro: "Тестовый ответ API.", points: [{ text: "Проверка источника <img src=x onerror=alert(1)>.", citations: [7] }], warning: null,
  sources: [{ n: 7, chunk_id: "test-7", doc_id: "test-document", title: "Тестовый документ", section: "Проверка отображения", page: 321, score: 2.345,
    text: "Масло 5W-30; MB 229.5; DOT 4+. Не выделять 15W-300. <script>alert(1)</script>", matched_terms: ["5W-30", "MB 229.5", "DOT 4+"] }],
};

async function main() {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(logs);
    try { if ((await fetch(base + "/api/vehicles")).ok) { ready = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, logs);
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  let passed = 0;
  const check = (name) => { passed++; console.log(`PASS ${name}`); };
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    // Внешний шрифт не должен влиять на воспроизводимость проверки.
    await page.route("https://fonts.**/*", (route) => route.abort());
    let handler = (route) => route.fulfill({ json: answer });
    const requests = [];
    await page.route("**/api/ask", async (route) => { requests.push(route.request().postDataJSON()); await handler(route); });
    const result = page.locator("#result");
    const question = page.locator("#question");
    const submit = async (text = "Как проверить моторное масло?") => {
      await question.fill(text);
      await page.locator("#ask-submit").click();
      await page.waitForFunction(() => document.querySelector("#result").getAttribute("aria-busy") === "false");
    };
    await page.goto(base);
    await page.waitForSelector('.model-tab[data-model="W213"]');
    assert.equal(await page.locator(".model-tab").count(), 3);
    assert.equal(await page.locator("#demo-tag").isVisible(), false);
    assert.match(await page.locator("#kb-list").innerText(), /10/);
    assert.equal(await page.locator("#ask-submit").isDisabled(), true);
    check("каталог через HTTP, выбор модели, пустой ввод");

    await submit();
    assert.deepEqual(requests.at(-1).vehicle, { model_code: "W213" });
    assert.match(await result.innerText(), /<img src=x/);
    assert.equal(await result.locator("img, script").count(), 0);
    await result.locator(".cite").click();
    assert.equal(await page.locator("#fragment-btn-7").getAttribute("aria-expanded"), "true");
    assert.deepEqual(await page.locator("#fragment-7 mark").allTextContents(), ["5W-30", "MB 229.5", "DOT 4+"]);
    assert.match(await page.locator("#fragment-7").innerText(), /2\.35/);
    check("POST, источники, сноски, безопасный текст, технические обозначения");

    const output = path.join(root, "tmp/frontend-images");
    fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ path: path.join(output, "kt2-contract-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(output, "kt2-contract-mobile.png"), fullPage: true });
    check("1440 и 390 px, без горизонтальной прокрутки");
    await page.setViewportSize({ width: 1440, height: 1000 });

    let clarify = true;
    handler = (route) => route.fulfill({ json: clarify ? { status: "clarify", message: "Уточните узел.", options: [{ label: "Двигатель", question: "Как долить моторное масло?" }] } : answer });
    await submit("Какое масло?");
    assert.match(await result.innerText(), /Требуется уточнение/i);
    clarify = false;
    await result.getByRole("button", { name: "Двигатель" }).click();
    await page.waitForFunction(() => document.querySelector("#result .sources"));
    assert.equal(requests.at(-1).question, "Как долить моторное масло?");
    check("уточнение отправляет новый вопрос");

    handler = (route) => route.fulfill({ json: { status: "no_context", message: "В документах нет ответа.", searched: [] } });
    await submit("Сколько стоит ТО?");
    assert.match(await result.innerText(), /Ответ не найден/i);
    assert.equal(await result.locator(".sources").count(), 0);
    check("отказ без подстановки источников");

    for (const status of [400, 404, 500, 503]) {
      handler = (route) => route.fulfill({ status, json: { error: "test" } });
      await submit();
      assert.equal(await result.locator('[role="alert"]').count(), 1);
      handler = (route) => route.fulfill({ json: answer });
      await result.getByRole("button", { name: "Повторить", exact: true }).click();
      await page.waitForFunction(() => document.querySelector("#result .sources"));
    }
    check("HTTP 400/404/500/503 и повтор запроса");

    for (const body of ["<html>error</html>", JSON.stringify({ status: "other" }), JSON.stringify({ ...answer, sources: [] }), JSON.stringify({ ...answer, points: [{ text: "сломанная сноска", citations: [99] }] })]) {
      handler = (route) => route.fulfill({ contentType: "application/json", body });
      await submit();
      assert.match(await result.innerText(), /неподдерживаемом формате/);
      assert.equal(await result.locator(".sources").count(), 0);
    }
    check("повреждённый JSON, неизвестный статус, отсутствие источников, неверные сноски");

    handler = (route) => route.abort("connectionfailed");
    await submit();
    assert.match(await result.innerText(), /соединиться/);
    await page.evaluate(() => { window.MANUALMATE_CONFIG.timeoutMs = 50; });
    handler = async (route) => { await new Promise((r) => setTimeout(r, 200)); await route.fulfill({ json: answer }).catch(() => {}); };
    await submit();
    assert.match(await result.innerText(), /не ответил вовремя/);
    await page.evaluate(() => { window.MANUALMATE_CONFIG.timeoutMs = 120000; });
    check("обрыв соединения и тайм-аут");

    let release;
    handler = async (route) => { await new Promise((r) => { release = r; }); await route.fulfill({ json: answer }).catch(() => {}); };
    await question.fill("Первый автомобиль");
    await page.locator("#ask-submit").click();
    await page.waitForFunction(() => document.querySelector("#result [role=progressbar]"));
    while (!release) await new Promise((r) => setTimeout(r, 10));
    await page.locator('[data-model="X253"]').click();
    release();
    handler = (route) => route.fulfill({ json: answer });
    await submit("Новый автомобиль");
    assert.equal(requests.at(-1).vehicle.model_code, "X253");
    await page.reload();
    await page.waitForSelector('[data-model="X253"][aria-pressed="true"]');
    assert.equal(await result.locator(".sources").count(), 0);
    check("отмена при смене автомобиля и сохранение выбора");

    await question.fill("Текст");
    const before = requests.length;
    await question.press("Shift+Enter");
    assert.equal(requests.length, before);
    await question.press("Enter");
    await page.waitForFunction(() => document.querySelector("#result .sources"));
    await question.evaluate((el) => { el.value = "x".repeat(501); el.dispatchEvent(new Event("input")); });
    assert.equal(await page.locator("#ask-submit").isDisabled(), true);
    check("Enter, Shift+Enter, ограничение 500 символов");

    await page.route("**/api/vehicles", (route) => route.fulfill({ status: 503, json: { error: "service_unavailable" } }));
    await page.reload();
    await page.waitForSelector('#result [role="alert"]');
    assert.equal(await page.locator("#ask-submit").isDisabled(), true);
    await page.unroute("**/api/vehicles");
    await result.getByRole("button", { name: "Повторить" }).click();
    await page.waitForSelector(".model-tab");
    check("ошибка загрузки каталога и восстановление");

    const noStorage = await browser.newContext();
    await noStorage.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error("blocked"); }; Storage.prototype.setItem = () => { throw new Error("blocked"); }; });
    const storagePage = await noStorage.newPage();
    await storagePage.goto(base);
    await storagePage.waitForSelector(".model-tab");
    check("работа без localStorage");
    await noStorage.close();

    const demoRequests = [];
    page.on("request", (r) => { if (r.url().includes("/api/")) demoRequests.push(r.url()); });
    await page.goto(base + "/?demo=1");
    await page.waitForSelector(".model-tab");
    await submit("Что входит в сервис B?");
    assert.equal(await page.locator("#demo-tag").isVisible(), true);
    assert.match(await result.innerText(), /Пример/i);
    assert.equal(demoRequests.length, 0);
    assert.deepEqual(errors, []);
    check("явный демо-режим КТ1 без запросов к API, без ошибок JavaScript");

    if (process.argv.includes("--live")) {
      await page.unroute("**/api/ask");
      await page.goto(base);
      await page.waitForSelector(".model-tab");
      await submit("Где находится таблица рекомендованного давления шин?");
      assert.equal(await result.locator(".sources").count(), 1);
      await result.locator(".cite").first().click();
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({ path: path.join(root, "docs/images/kt2-live-desktop.png"), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => {
        const field = document.getElementById("question");
        return field.scrollHeight <= field.clientHeight + 1;
      });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await question.evaluate((el) => el.scrollHeight <= el.clientHeight + 1), true);
      await page.screenshot({ path: path.join(root, "docs/images/kt2-live-mobile.png"), fullPage: true });
      check("настоящий HTTP → BM25 → Ollama → ответ в браузере");
    }
    console.log(`PASS: ${passed} групп браузерных проверок`);
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => { server.kill("SIGTERM"); });
