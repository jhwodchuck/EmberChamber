import React, { ReactNode } from "react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { JsonLd } from "@/components/json-ld";
import { docsNav, siteUrl } from "@/lib/site";
import { BookOpen, ArrowLeft, ArrowRight } from "lucide-react";

interface DocsPageProps {
  title: string;
  description: string;
  currentPath: string;
  children: ReactNode;
}

export function DocsPage({
  title,
  description,
  currentPath,
  children,
}: DocsPageProps) {
  // Find next/prev articles
  const currentIndex = docsNav.findIndex((item) => item.href === currentPath);
  const prevDoc = currentIndex > 0 ? docsNav[currentIndex - 1] : null;
  const nextDoc =
    currentIndex !== -1 && currentIndex < docsNav.length - 1
      ? docsNav[currentIndex + 1]
      : null;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    url: `${siteUrl}${currentPath}`,
    mainEntityOfPage: `${siteUrl}${currentPath}`,
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      name: "EmberChamber",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "EmberChamber",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/brand/emberchamber-mark.svg`,
      },
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Documentation",
        item: `${siteUrl}/docs`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: `${siteUrl}${currentPath}`,
      },
    ],
  };

  return (
    <MarketingShell>
      <JsonLd json={articleSchema} />
      <JsonLd json={breadcrumbSchema} />
      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        {/* Header Section */}
        <div className="cinema-panel relative overflow-hidden rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10 mb-8">
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-80 bg-[radial-gradient(circle_at_center,rgba(255,170,110,0.16),transparent_62%)]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 glow-grid opacity-35"
            aria-hidden="true"
          />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 eyebrow mb-3">
                <BookOpen className="h-4 w-4 text-brand-400" />
                <span>Documentation</span>
              </div>
              <h1 className="text-balance font-display text-4xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
                {description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 h-fit">
              <Link href="/download" className="btn-primary">
                Download App
              </Link>
              <Link href="/support" className="btn-ghost">
                Need Support
              </Link>
            </div>
          </div>
        </div>

        {/* Dynamic Sidebar + Content Section */}
        <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
          {/* Sidebar */}
          <aside className="cinema-panel h-fit rounded-[2rem] px-5 py-6 lg:sticky lg:top-28">
            <p className="section-kicker mb-4 px-2">Articles</p>
            <nav className="flex flex-col gap-1.5">
              {docsNav.map((item) => {
                const isActive = item.href === currentPath;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 border ${
                      isActive
                        ? "bg-white/[0.06] border-brand-500/30 text-[#fff1e8] shadow-inner"
                        : "border-transparent text-[var(--text-secondary)] hover:bg-white/[0.03] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-6 border-t border-white/10 pt-4 px-2">
              <Link
                href="/docs"
                className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>All Documents</span>
              </Link>
            </div>
          </aside>

          {/* Main Content */}
          <div className="cinema-panel rounded-[2.2rem] px-6 py-8 sm:px-10 sm:py-10 min-h-[500px]">
            <article className="prose-block max-w-none text-[var(--text-secondary)] leading-7 text-sm sm:text-base space-y-6">
              {children}
            </article>

            {/* Next / Prev Pagination */}
            {(prevDoc || nextDoc) && (
              <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-4">
                {prevDoc ? (
                  <Link
                    href={prevDoc.href}
                    className="flex-1 rounded-[1.45rem] border border-white/8 bg-white/[0.02] p-5 transition-all hover:border-brand-500/25 flex flex-col items-start gap-1"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a98982] flex items-center gap-1">
                      <ArrowLeft className="h-3 w-3" /> Previous Article
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                      {prevDoc.label}
                    </span>
                  </Link>
                ) : (
                  <div className="flex-1 hidden sm:block" />
                )}

                {nextDoc ? (
                  <Link
                    href={nextDoc.href}
                    className="flex-1 rounded-[1.45rem] border border-white/8 bg-white/[0.02] p-5 transition-all hover:border-brand-500/25 flex flex-col items-end gap-1 text-right"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a98982] flex items-center gap-1">
                      Next Article <ArrowRight className="h-3 w-3" />
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                      {nextDoc.label}
                    </span>
                  </Link>
                ) : (
                  <div className="flex-1 hidden sm:block" />
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
