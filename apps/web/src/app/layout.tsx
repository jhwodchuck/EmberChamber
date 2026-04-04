import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { siteUrl } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "EmberChamber",
    template: "%s | EmberChamber",
  },
  description:
    "Invite-only encrypted messaging for trusted circles with a minimal relay, local-first history, and honest privacy boundaries.",
  applicationName: "EmberChamber",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "private messaging",
    "encrypted messaging",
    "invite-only messenger",
    "Android beta messenger",
    "Tauri desktop messenger",
    "minimal relay",
  ],
  icons: {
    icon: "/brand/emberchamber-mark.svg",
    shortcut: "/brand/emberchamber-mark.svg",
  },
  openGraph: {
    title: "EmberChamber",
    description:
      "Invite-only encrypted messaging for trusted circles with a minimal relay and local-first history.",
    url: siteUrl,
    siteName: "EmberChamber",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "EmberChamber",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EmberChamber",
    description:
      "Invite-only encrypted messaging for trusted circles with a minimal relay and local-first history.",
    images: ["/twitter-image"],
  },
};

const themeInitScript = `
  (function () {
    try {
      var storedTheme = window.localStorage.getItem("theme");
      var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var resolvedTheme = storedTheme === "dark" || ((storedTheme === null || storedTheme === "system") && prefersDark)
        ? "dark"
        : "light";
      document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    } catch (error) {
      document.documentElement.classList.add("dark");
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${cormorant.variable} font-sans`}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <a
          href="#main-content"
          className="sr-only absolute left-4 top-4 z-50 rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] shadow focus:not-sr-only"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
