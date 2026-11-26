// Web App Manifest, served at /manifest.webmanifest and linked automatically by Next.js.
export default function manifest() {
	return {
		id: "/",
		name: "Realei – Gioca e impara le aste immobiliari",
		short_name: "Realei Gioca",
		description: "Impara a leggere un'asta immobiliare giocando: trova gli indizi nei documenti con l'aiuto dell'AI.",
		lang: "it",
		start_url: "/",
		scope: "/",
		display: "standalone",
		orientation: "any",
		background_color: "#ffffff",
		theme_color: "#000000",
		categories: ["education", "games"],
		icons: [
			{ src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
			{ src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
			{ src: "/icons/maskable-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
			{ src: "/icons/maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
		],
		shortcuts: [
			{ name: "Gioca", url: "/play", icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }] },
			{ name: "Impara", url: "/learn", icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }] },
		],
	};
}
