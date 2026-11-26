import { z } from "zod";
import { CHECKERS } from "@/utils/answers";
import { findAuction, loadAnswers, rateLimit, tooMany } from "@/utils/server";

const Body = z.object({
    auctionId: z.string().max(20),
    clueId: z.enum(Object.keys(CHECKERS)),
    answer: z.string().trim().min(1).max(200),
});

// POST {auctionId, clueId, answer} -> {correct}. The expected answers never leave the server.
export async function POST(request) {
    const limited = rateLimit(request, "check", 60, 60_000);
    if (!limited.ok) return tooMany(limited.retryAfter);

    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Richiesta non valida." }, { status: 400 });
    const { auctionId, clueId, answer } = parsed.data;

    if (!findAuction(auctionId)) return Response.json({ error: "Asta non trovata." }, { status: 404 });
    try {
        const expected = (await loadAnswers(auctionId))[clueId];
        return Response.json({ correct: CHECKERS[clueId](answer, expected) });
    } catch (error) {
        console.error("CHECK ERROR:", error);
        return Response.json({ error: "Verifica non disponibile." }, { status: 500 });
    }
}
