import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "PrivateMesh",
    template: "%s · PrivateMesh",
  },
  description:
    "PrivateMesh — privacy-first messaging for groups, channels, and communities. Built for user control and resilient communication.",
  keywords: ["messaging", "privacy", "encrypted chat", "communities", "groups"],
  openGraph: {
    type: "website",
    siteName: "PrivateMesh",
    title: "PrivateMesh",
    description: "Privacy-first messaging for your communities",
  },
  twitter: {
    card: "summary",
    title: "PrivateMesh",
    description: "Privacy-first messaging for your communities",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            },
          }}
        />
      </body>
    </html>
  );
}
