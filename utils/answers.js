// Answer normalisation and checking. Server-only: used by app/api/check (the expected answers live in
// data/answers/<auctionId>.json, outside public/, so players cannot read them from the browser).

export function normalizeText(value) {
    return String(value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")       // accents
        .replace(/[^\p{L}\p{N}\s]/gu, " ")     // punctuation
        .replace(/\s+/g, " ")
        .trim();
}

/** "€ 214.000", "214000", "98,00 m²", "98.5", "1.234,56" -> number (null when there is none). */
export function normalizeNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const match = String(value ?? "").replace(/\s/g, "").match(/-?\d[\d.,]*/);
    if (!match) return null;
    let s = match[0].replace(/[.,]$/, "");
    const lastComma = s.lastIndexOf(","), lastDot = s.lastIndexOf(".");
    if (lastComma >= 0 && lastDot >= 0) {
        // both separators: the last one is the decimal separator
        s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    } else if (lastComma >= 0) {
        // only commas: "98,5" decimal, "1,234,567" thousands
        s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
    } else if (lastDot >= 0) {
        // only dots: "214.000" / "1.234.567" thousands (Italian), "98.5" decimal
        s = /^-?\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s;
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

/** "19/05/2026", "19-5-2026", "19.05.26", "2026-05-19" -> "2026-05-19" (null if not a date). */
export function normalizeDate(value) {
    const s = String(value ?? "").trim();
    let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    let y, mo, d;
    if (m) [, y, mo, d] = m;
    else {
        m = s.match(/(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{2,4})/);
        if (!m) return null;
        [, d, mo, y] = m;
        if (y.length === 2) y = `20${y}`;
    }
    const date = new Date(Date.UTC(+y, +mo - 1, +d));
    if (date.getUTCFullYear() !== +y || date.getUTCMonth() !== +mo - 1 || date.getUTCDate() !== +d) return null;
    return date.toISOString().slice(0, 10);
}

const numberEquals = (a, b) => {
    const x = normalizeNumber(a), y = normalizeNumber(b);
    return x !== null && y !== null && Math.abs(x - y) < 0.005;
};

export const CHECKERS = {
    superficie: numberEquals,
    prezzoBase: numberEquals,
    dataAsta: (a, b) => {
        const x = normalizeDate(a);
        return x !== null && x === normalizeDate(b);
    },
    occupazione: (a, b) => {
        const user = normalizeText(a), expected = normalizeText(b);
        if (!user || !expected) return false;
        // the free/occupied state must match: "libero" never accepts "occupato" and vice versa
        const state = (t) => (/\blibero\b/.test(t) ? "libero" : /\boccupat/.test(t) ? "occupato" : null);
        if (state(user) !== state(expected)) return false;
        return user === expected || user.includes(expected) || (state(user) !== null && expected.split(" ").filter((w) => w.length > 3).every((w) => user.includes(w)));
    },
};
