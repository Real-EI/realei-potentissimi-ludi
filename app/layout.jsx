import "./globals.css";

// import { ThemeProvider } from "next-themes";
// import NextTopLoader from "nextjs-toploader";
// import NavBar from "@/components/NavBar";
// import ThemeToggle from "@/components/ThemeToggle";

// Public URL of the site: absolute links for social previews (Open Graph / X cards).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3001";
const TITLE = "Realei – Gioca e Impara";
const DESCRIPTION = "Impara a leggere un'asta immobiliare giocando: trova gli indizi nei documenti di un'asta vera con l'aiuto dell'AI.";

export const metadata = {
	metadataBase: new URL(SITE_URL),
	title: { default: TITLE, template: "%s · Realei" },
	description: DESCRIPTION,
	applicationName: "Realei Gioca",
	keywords: ["aste immobiliari", "aste giudiziarie", "intelligenza artificiale", "gioco", "perizia", "Real-EI"],
	alternates: { canonical: "/" },
	appleWebApp: { capable: true, statusBarStyle: "default", title: "Realei" },
	openGraph: {
		type: "website",
		locale: "it_IT",
		url: "/",
		siteName: "Realei",
		title: TITLE,
		description: DESCRIPTION,
	},
	twitter: {
		card: "summary_large_image",
		title: TITLE,
		description: DESCRIPTION,
	},
	robots: { index: true, follow: true },
};

export const viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
	themeColor: "#000000",
};

// const geistSans = Geist({
// 	variable: "--font-geist-sans",
// 	subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
// 	variable: "--font-geist-mono",
// 	subsets: ["latin"],
// });

// export const metadata = {
// 	title: "Realei – Notte dei Ricercatori",
// 	description: "Scopri eventi, attività e iniziative della Notte dei Ricercatori.",
// 	applicationName: "realei-notte-ricercatori",
// 	manifest: "/manifest.webmanifest",
// 	themeColor: "#000000",
// 	appleWebApp: {
// 		capable: true,
// 		statusBarStyle: "default",
// 		title: "Realei – Notte dei Ricercatori",
// 	},
// };

// export const viewport = {
// 	width: "device-width",
// 	initialScale: 1,
// 	viewportFit: "cover",
// };
import "./globals.css";

import { ThemeProvider } from "next-themes";
import NextTopLoader from "nextjs-toploader";
import NavBar from "@/components/NavBar";
import ThemeToggle from "@/components/ThemeToggle";

export default function RootLayout({ children }) {
	return (
		<html lang="it" suppressHydrationWarning>
			<body className="min-h-full flex flex-col antialiased">
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
				>
					<NextTopLoader
						color="#000000"
						initialPosition={0.08}
						crawlSpeed={200}
						height={3}
						crawl
						showSpinner={false}
						easing="ease"
						speed={200}
					/>

					<NavBar />
					<ThemeToggle />
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}
