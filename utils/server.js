// Server-only helpers shared by the API routes.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { AUCTIONS } from "@/utils/auctions";

const ROOT = process.cwd();

/** Only ids listed in utils/auctions.js are accepted (no path traversal, no arbitrary files). */
export function findAuction(id) {
    return AUCTIONS.find((a) => a.id === String(id)) || null;
}

async function readJson(file) {
    return JSON.parse(await readFile(file, "utf-8"));
}

export function loadAnswers(id) {
    return readJson(path.join(ROOT, "data", "answers", `${id}.json`));
}

export function loadMetadata(id) {
    return readJson(path.join(ROOT, "public", "auctions", `${id}`, "metadata.json"));
}

// Simple in-memory fixed-window rate limiter (per server instance; enough for a single container).
const buckets = new Map();

export function rateLimit(request, key, limit, windowMs) {
    const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim()
        || request.headers.get("x-real-ip") || "unknown";
    const now = Date.now();
    const id = `${key}:${ip}`;
    const bucket = buckets.get(id);
    if (!bucket || now > bucket.reset) {
        buckets.set(id, { count: 1, reset: now + windowMs });
        if (buckets.size > 10000) {
            for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
        }
        return { ok: true };
    }
    bucket.count += 1;
    return bucket.count <= limit ? { ok: true } : { ok: false, retryAfter: Math.ceil((bucket.reset - now) / 1000) };
}

export function tooMany(retryAfter) {
    return Response.json({ error: "Troppe richieste. Riprova tra poco." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } });
}
