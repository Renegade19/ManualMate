"use strict";

window.ManualMateAPI = (() => {
  class APIError extends Error {
    constructor(code) { super(code); this.code = code; }
  }
  const string = (v) => typeof v === "string" && v.trim().length > 0;
  const integer = (v) => Number.isInteger(v) && v >= 0;
  function require(value) { if (!value) throw new APIError("invalid_response"); }

  function validateVehicles(data) {
    require(Array.isArray(data?.vehicles));
    const codes = new Set();
    for (const v of data.vehicles) {
      require(v && string(v.model_code) && string(v.name) && string(v.body) && string(v.years));
      require(!codes.has(v.model_code) && Array.isArray(v.engines));
      codes.add(v.model_code);
      const engines = new Set();
      for (const e of v.engines) {
        require(e && string(e.code) && string(e.label) && !engines.has(e.code));
        engines.add(e.code);
      }
      require(v.documents === undefined || integer(v.documents));
    }
    return data.vehicles;
  }

  function validateAnswer(data) {
    require(data && ["answer", "clarify", "no_context"].includes(data.status));
    if (data.status === "answer") {
      require(string(data.intro) && Array.isArray(data.points) && Array.isArray(data.sources) && data.sources.length > 0);
      require(data.warning == null || typeof data.warning === "string");
      const numbers = new Set();
      for (const s of data.sources) {
        require(s && integer(s.n) && s.n > 0 && !numbers.has(s.n));
        require([s.chunk_id, s.doc_id, s.title, s.section, s.text].every(string));
        require(integer(s.page) && s.page > 0 && Number.isFinite(s.score) && s.score >= 0);
        require(s.matched_terms === undefined || (Array.isArray(s.matched_terms) && s.matched_terms.every(string)));
        numbers.add(s.n);
      }
      for (const p of data.points) {
        require(p && string(p.text) && Array.isArray(p.citations) && p.citations.length > 0);
        require(p.citations.every((n) => numbers.has(n)));
      }
    } else if (data.status === "clarify") {
      require(string(data.message) && Array.isArray(data.options) && data.options.length > 0);
      require(data.options.every((o) => o && string(o.label) && string(o.question) && o.question.length <= 500));
    } else {
      require(string(data.message) && Array.isArray(data.searched));
      require(data.searched.every((d) => d && string(d.doc_id) && string(d.title) && integer(d.hits)));
    }
    return data;
  }

  async function request(path, options = {}) {
    const config = window.MANUALMATE_CONFIG || {};
    const base = (config.apiBaseUrl || "").replace(/\/$/, "");
    const timeout = Number.isFinite(config.timeoutMs) && config.timeoutMs > 0 ? config.timeoutMs : 120000;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    const external = options.signal;
    external?.addEventListener("abort", cancel, { once: true });
    if (external?.aborted) cancel();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
    try {
      const response = await fetch(base + path, { ...options, signal: controller.signal, cache: "no-store" });
      if (!response.ok) {
        const codes = { 400: "question_invalid", 404: "vehicle_unknown", 503: "service_unavailable", 500: "internal" };
        throw new APIError(codes[response.status] || "http_error");
      }
      return await response.json();
    } catch (error) {
      if (timedOut) throw new APIError("timeout");
      if (external?.aborted) throw new DOMException("Запрос отменён", "AbortError");
      if (error instanceof APIError) throw error;
      throw new APIError(error instanceof SyntaxError ? "invalid_response" : "network");
    } finally {
      clearTimeout(timer);
      external?.removeEventListener("abort", cancel);
    }
  }

  return {
    vehicles: async () => validateVehicles(await request("/api/vehicles")),
    ask: async (question, vehicle, signal) => validateAnswer(await request("/api/ask", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, vehicle: { model_code: vehicle.model_code, ...(vehicle.engine ? { engine: vehicle.engine.code } : {}) } }), signal,
    })),
  };
})();
