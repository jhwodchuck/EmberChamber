import React from "react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { createMetadata } from "@/lib/metadata";
import { docsNav } from "@/lib/site";
import { BookOpen, ArrowRight } from "lucide-react";

export const metadata = createMetadata({
  title: "Documentation",
  description:
    "Browse EmberChamber's documentation on private messaging, local-first architectures, encryption, and platform guides.",
  path: "/docs",
});

const docSummaries: Record<string, string> = {
  "/docs/no-phone-number-private-messaging":
    "Why EmberChamber avoids exposing phone numbers and uses invite-only email bootstrap.",
  "/docs/local-first-messaging":
    "How message histories and search indices stay on device instead of central archives.",
  "/docs/relay-boundary":
    "What details the hosted edge relay coordinates, and what is kept completely out of its reach.",
  "/docs/encrypted-group-chat":
    "Technical details of our small-group membership, group keys, and coordination.",
  "/docs/android-private-messenger-beta":
    "A setup and feature guide for Android, our primary daily messaging surface.",
  "/docs/windows-encrypted-messenger":
    "How to run the native Tauri client on Windows for long keyboard-friendly chat sessions.",
  "/docs/ubuntu-encrypted-messenger":
    "Linux installation instructions using AppImage and .deb packages for operators.",
};

export default function DocsIndexPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="cinema-panel relative overflow-hidden rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10 mb-12">
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-80 bg-[radial-gradient(circle_at_center,rgba(255,170,110,0.16),transparent_62%)]"
            aria-hidden="true"
          />
          <div className="relative max-w-3xl">
            <div className="flex items-center gap-2 eyebrow mb-3">
              <BookOpen className="h-4 w-4 text-brand-400" />
              <span>Documentation Hub</span>
            </div>
            <h1 className="text-balance font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
              Understand the trust boundaries.
            </h1>
            <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
              EmberChamber is built on transparency, device-local history, and
              clear relay boundaries. Learn how the client apps handle your
              keys, conversations, and data below.
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {docsNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[1.45rem] border border-white/8 bg-white/[0.04] p-6 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brand-500/25 flex flex-col justify-between"
            >
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {item.label}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {docSummaries[item.href] ||
                    "Read our technical details and architectural guidelines."}
                </p>
              </div>
              <span className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-brand-300">
                Read Article <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
