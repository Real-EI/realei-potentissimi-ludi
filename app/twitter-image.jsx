// Social preview image (1200x630) used by Facebook, LinkedIn, WhatsApp, Telegram, X... Generated at build time.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Realei – Gioca e impara le aste immobiliari con l'AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
	const icon = await readFile(path.join(process.cwd(), "public/icons/icon-512x512.png"));
	const iconSrc = `data:image/png;base64,${icon.toString("base64")}`;

	return new ImageResponse(
		(
			<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", padding: "0 80px",
				background: "linear-gradient(135deg, #020617 0%, #172554 55%, #1e40af 100%)", color: "white", fontFamily: "sans-serif" }}>
				<div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 40 }}>
					<div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: "#7dd3fc", fontWeight: 700 }}>REALEI / AI × REAL ESTATE</div>
					<div style={{ display: "flex", fontSize: 84, fontWeight: 800, lineHeight: 1.05, marginTop: 24 }}>Gioca e impara</div>
					<div style={{ display: "flex", fontSize: 36, lineHeight: 1.3, marginTop: 24, color: "#dbeafe" }}>
						Leggi i documenti di un&apos;asta vera, trova gli indizi e fatti aiutare dall&apos;AI.
					</div>
					<div style={{ display: "flex", marginTop: 40 }}>
						<div style={{ display: "flex", padding: "14px 32px", borderRadius: 999, fontSize: 30, fontWeight: 700,
							background: "linear-gradient(90deg, #2563eb, #0ea5e9)" }}>Inizia la missione →</div>
					</div>
				</div>
				<img src={iconSrc} width={340} height={340} alt="" />
			</div>
		),
		size,
	);
}
