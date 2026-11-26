// LLM access with provider fallback and bounded retries (same rules as scraping_realel/modules/llm_wrapper.py).
//
// Provider order (first usable one wins, the next is only a fallback):
//   1. llm7.io     -> LLM7_API_KEY        (+ LLM7_MODEL, LLM7_URL)
//   2. OpenRouter  -> OPENROUTER_API_KEY  (+ OPENROUTER_MODEL, OPENROUTER_URL)
// Models default to each interface's own default: llm7 "default", OpenRouter "openrouter/auto".
//   3. local       -> LOCAL_LLM_URL (+ LOCAL_LLM_MODEL, LOCAL_LLM_API_KEY): self-hosted OpenAI-compatible server,
//                     e.g. the llama.cpp "llm" service of the root docker-compose (Gemma 4 E2B on CPU).
//                     No key needed; it is reachable as long as the URL is set.
//   4. none        -> isLLMAvailable() is false, the chat answers 503.
// Back-compat: LLM_BASE_URL / LLM_API_KEY / LLM_MODEL fill the slot of the provider whose host they point to.
//
// "API key OK": llm7 -> key set (llm7 also accepts anonymous calls, nothing to probe);
//               OpenRouter -> key set AND GET /key says it is valid with credit left (free, once per process).
// Per request:
//   - 429 / 5xx / timeout / connection error / empty answer -> retry the SAME provider (LLM_MAX_RETRIES,
//     exponential backoff + Retry-After), then redirect to the next provider;
//   - 401 / 402 / 403 / 404 -> provider disabled for the process, redirect;
//   - 400 and other errors  -> no retry, redirect;
//   - LLM_FAILURES_BEFORE_COOLDOWN failed requests in a row -> provider skipped for LLM_PROVIDER_COOLDOWN seconds.
// Streaming: retries/redirects happen only BEFORE the first token reaches the player; the OpenAI SDK's own
// retries are disabled so attempts never multiply.
import OpenAI from "openai";

const LLM7_URL = "https://api.llm7.io/v1";
const OPENROUTER_URL = "https://openrouter.ai/api/v1";
const PLACEHOLDER_KEYS = new Set(["", "none", "null", "local-key", "changeme", "your-api-key", "xxx", "lm-studio"]);

const env = (name, fallback) => {
    const v = (process.env[name] || "").trim().replace(/^["']|["']$/g, "");
    return v || fallback;
};
const envNumber = (name, fallback) => {
    const n = Number(env(name, ""));
    return Number.isFinite(n) && env(name, "") !== "" ? n : fallback;
};
const keyPresent = (key) => !!key && !PLACEHOLDER_KEYS.has(key.toLowerCase());
const hostOf = (url) => { try { return new URL(url).hostname.toLowerCase(); } catch { return ""; } };

const settings = () => ({
    maxRetries: envNumber("LLM_MAX_RETRIES", 2),
    baseDelay: envNumber("LLM_RETRY_BASE_DELAY", 2) * 1000,
    maxDelay: envNumber("LLM_RETRY_MAX_DELAY", 60) * 1000,
    cooldown: envNumber("LLM_PROVIDER_COOLDOWN", 300) * 1000,
    failuresBeforeCooldown: envNumber("LLM_FAILURES_BEFORE_COOLDOWN", 2),
    timeout: envNumber("LLM_TIMEOUT", 60) * 1000,
});

function providerSpecs() {
    const legacyUrl = env("LLM_BASE_URL"), legacyKey = env("LLM_API_KEY"), legacyModel = env("LLM_MODEL");
    const legacyHost = hostOf(legacyUrl);
    const isLlm7 = legacyHost.endsWith("llm7.io"), isOr = legacyHost.endsWith("openrouter.ai");
    return [
        {
            name: "llm7",
            url: env("LLM7_URL") || (isLlm7 ? legacyUrl : LLM7_URL),
            apiKey: env("LLM7_API_KEY") || (isLlm7 ? legacyKey : undefined),
            model: env("LLM7_MODEL") || (isLlm7 ? legacyModel : undefined) || "default",
        },
        {
            name: "openrouter",
            url: env("OPENROUTER_URL") || (isOr ? legacyUrl : OPENROUTER_URL),
            apiKey: env("OPENROUTER_API_KEY") || (isOr ? legacyKey : undefined),
            model: env("OPENROUTER_MODEL") || (isOr ? legacyModel : undefined) || "openrouter/auto",
        },
        {
            name: "local",
            url: env("LOCAL_LLM_URL"),
            apiKey: env("LOCAL_LLM_API_KEY") || (env("LOCAL_LLM_URL") ? "local" : undefined),
            model: env("LOCAL_LLM_MODEL") || "gemma-4-e2b",
            local: true,
        },
    ];
}

async function openRouterKeyOk(url, key) {
    try {
        const r = await fetch(`${url.replace(/\/$/, "")}/key`, {
            headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000),
        });
        if (r.status !== 200) return [false, `key rejected (HTTP ${r.status})`];
        const remaining = (await r.json().catch(() => ({})))?.data?.limit_remaining;
        if (remaining !== null && remaining !== undefined && remaining <= 0) return [false, "no credit left"];
        return [true, "ok"];
    } catch (e) {
        return [true, `key check skipped (${e.name})`];   // network hiccup: request-time errors decide
    }
}

let providersPromise = null;

/** Ordered list of providers whose API key is OK (resolved once per server process). */
export function getProviders() {
    providersPromise ??= (async () => {
        const { timeout } = settings();
        const out = [];
        for (const spec of providerSpecs()) {
            if (spec.local ? !spec.url : !keyPresent(spec.apiKey)) {
                console.log(`[LLM] ${spec.name}: ${spec.local ? "no LOCAL_LLM_URL" : "no API key"} -> skipped`);
                continue;
            }
            if (!spec.model) { console.log(`[LLM] ${spec.name}: no model (${spec.name.toUpperCase()}_MODEL) -> skipped`); continue; }
            if (spec.name === "openrouter") {
                const [ok, why] = await openRouterKeyOk(spec.url, spec.apiKey);
                if (!ok) { console.log(`[LLM] ${spec.name}: ${why} -> skipped`); continue; }
            }
            out.push({
                ...spec,
                // a CPU model is slower: give it a longer timeout than the hosted providers
                client: new OpenAI({ baseURL: spec.url, apiKey: spec.apiKey, timeout: spec.local ? Math.max(timeout, 180_000) : timeout, maxRetries: 0 }),
                disabledReason: null, cooldownUntil: 0, consecutiveFailures: 0,
            });
            console.log(`[LLM] ${spec.name}: enabled (model=${spec.model})`);
        }
        if (!out.length) console.log("[LLM] no usable provider (set LLM7_API_KEY, OPENROUTER_API_KEY or LOCAL_LLM_URL)");
        return out;
    })();
    return providersPromise;
}

export async function isLLMAvailable() {
    return (await getProviders()).length > 0;
}

export class LLMUnavailableError extends Error {}
class EmptyResponse extends Error {}

const RETRY = "retry", REDIRECT = "redirect", DISABLE = "disable", QUOTA = "quota";

// 429 caused by an exhausted quota/credit (llm7 "quota_exceeded", OpenAI "insufficient_quota"):
// retrying right away cannot work, so the provider is cooled down for its retry_after and skipped.
const QUOTA_CODES = new Set(["quota_exceeded", "insufficient_quota", "billing_hard_limit_reached"]);
const isQuotaError = (e) => e?.status === 429 &&
    (QUOTA_CODES.has(e?.code) || QUOTA_CODES.has(e?.type) || QUOTA_CODES.has(e?.error?.code) || QUOTA_CODES.has(e?.error?.type));

function classify(e) {
    if (e instanceof EmptyResponse || e instanceof OpenAI.APIConnectionError) return RETRY;   // includes timeouts
    const s = e?.status;
    if (isQuotaError(e)) return QUOTA;
    if ([401, 402, 403, 404].includes(s)) return DISABLE;
    if (s === 429 || s === 408 || s === 409 || (s >= 500)) return RETRY;
    return REDIRECT;
}

function retryAfterMs(e) {
    // Retry-After header, else "retry_after" in the JSON error body (llm7 sends it there)
    const v = e?.headers?.get?.("retry-after") ?? e?.headers?.["retry-after"] ?? e?.error?.retry_after ?? e?.retry_after;
    const n = Number(v);
    return Number.isFinite(n) && v != null ? n * 1000 : null;
}

const usable = (p) => !p.disabledReason && Date.now() >= p.cooldownUntil;

const sleep = (ms, signal) => new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); reject(signal.reason); }, { once: true });
});

/** Opens a stream and waits for its first token, so a failing provider can still be retried/redirected. */
async function openStream(p, params, signal) {
    const stream = await p.client.chat.completions.create({ ...params, model: p.model, stream: true }, { signal });
    const it = stream[Symbol.asyncIterator]();
    for (;;) {
        const { value, done } = await it.next();
        if (done) throw new EmptyResponse("empty completion");
        const text = value?.choices?.[0]?.delta?.content;
        if (text) return { stream, it, first: text };
    }
}

async function tryProvider(p, params, signal, attempts) {
    const cfg = settings();
    let last;
    for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
        const t0 = Date.now();
        try {
            const opened = await openStream(p, params, signal);
            attempts.push({ provider: p.name, attempt: attempt + 1, ok: true, ms: Date.now() - t0 });
            return opened;
        } catch (e) {
            if (signal?.aborted) throw e;
            last = e;
            const kind = classify(e);
            attempts.push({ provider: p.name, attempt: attempt + 1, ok: false, action: kind, status: e?.status ?? null });
            if (kind === QUOTA) {
                const ms = Math.max(retryAfterMs(e) ?? 60_000, 5_000);
                p.cooldownUntil = Date.now() + ms;
                console.log(`[LLM] ${p.name}: quota exhausted (${e?.error?.code || e?.code || "429"}) -> skipped for ${Math.round(ms / 1000)}s, redirecting`);
                throw e;
            }
            if (kind === DISABLE) {
                p.disabledReason = `HTTP ${e.status}: ${String(e.message).slice(0, 200)}`;
                console.log(`[LLM] ${p.name}: disabled for this process (${p.disabledReason}) -> redirecting`);
                throw e;
            }
            if (kind === REDIRECT || attempt >= cfg.maxRetries) break;
            const delay = Math.min(cfg.maxDelay, retryAfterMs(e) ?? cfg.baseDelay * 2 ** attempt) + Math.random() * 500;
            console.log(`[LLM] ${p.name}: ${e.name} (HTTP ${e?.status ?? "-"}), retry ${attempt + 1}/${cfg.maxRetries} in ${(delay / 1000).toFixed(1)}s`);
            await sleep(delay, signal);
        }
    }
    p.consecutiveFailures += 1;
    if (p.consecutiveFailures >= cfg.failuresBeforeCooldown) {
        const ms = Math.max(cfg.cooldown, retryAfterMs(last) ?? 0);
        p.cooldownUntil = Date.now() + ms;
        console.log(`[LLM] ${p.name}: ${p.consecutiveFailures} failed requests in a row -> cooldown ${Math.round(ms / 1000)}s`);
    }
    throw last;
}

/**
 * Streamed chat completion with provider fallback.
 * Returns { provider, model, textStream } where textStream is an async iterable of text chunks.
 * Throws LLMUnavailableError when no provider can be used, or the last provider error.
 */
export async function streamChat(params, { signal } = {}) {
    const providers = await getProviders();
    if (!providers.length) throw new LLMUnavailableError("no LLM provider configured (LLM7_API_KEY / OPENROUTER_API_KEY)");
    const attempts = [];
    let last = null, tried = 0;
    for (const [i, p] of providers.entries()) {
        if (!usable(p)) continue;
        tried += 1;
        try {
            const { stream, it, first } = await tryProvider(p, params, signal, attempts);
            p.consecutiveFailures = 0;
            console.log(`[LLM] chat: ${p.name}/${p.model} http_requests=${attempts.length}`);
            const textStream = (async function* () {
                try {
                    yield first;
                    for (;;) {
                        const { value, done } = await it.next();
                        if (done) return;
                        const text = value?.choices?.[0]?.delta?.content;
                        if (text) yield text;
                    }
                } finally {
                    stream.controller?.abort?.();
                }
            })();
            return { provider: p.name, model: p.model, textStream, attempts };
        } catch (e) {
            if (signal?.aborted) throw e;
            last = e;
            const next = providers.slice(i + 1).find(usable);
            if (next) console.log(`[LLM] ${p.name} failed (${e.name}) -> redirecting to ${next.name}`);
        }
    }
    if (!tried) {
        const reasons = providers.map((p) => `${p.name}: ${p.disabledReason || "cooling down"}`).join("; ");
        throw new LLMUnavailableError(`every LLM provider is unavailable (${reasons})`);
    }
    throw last;
}
