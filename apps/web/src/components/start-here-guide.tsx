import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Download,
  KeyRound,
  LifeBuoy,
  MailCheck,
  type LucideIcon,
} from "lucide-react";
import { StatusCallout } from "@/components/status-callout";
import { authBootstrapEnabled } from "@/lib/site";

type StartPath = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
  tempo: string;
  highlights: string[];
  primary: {
    href: string;
    label: string;
  };
  secondary?: {
    href: string;
    label: string;
  };
};

const startSteps = [
  {
    number: "01",
    title: "Start in web",
    body: "Review the boundary, confirm access, and get the first session running without an install.",
  },
  {
    number: "02",
    title: "Keep the same private email",
    body: "Use one inbox for invite, sign-in, and recovery so the account state stays consistent.",
  },
  {
    number: "03",
    title: "Install a daily-use client when you want one",
    body: "Android and desktop builds are there when the browser stops being enough.",
  },
] as const;

function getStartPaths(): StartPath[] {
  return [
    {
      icon: Compass,
      eyebrow: "New Here",
      title: "See how EmberChamber works",
      body: "Start with the trust model, current scope, and where your data actually lives.",
      accent: "from-brand-500/20 via-brand-500/5 to-transparent",
      tempo: "Best when you are evaluating",
      highlights: [
        "Trust model first",
        "Download status stays visible",
      ],
      primary: {
        href: "/trust-and-safety",
        label: "How It Works",
      },
      secondary: {
        href: "/download",
        label: "Check Downloads",
      },
    },
    authBootstrapEnabled
      ? {
          icon: MailCheck,
          eyebrow: "Have An Invite",
          title: "Join the beta",
          body: "Bring the invite token and the private email that will stay tied to access and recovery.",
          accent: "from-amber-300/20 via-amber-200/5 to-transparent",
          tempo: "Best when your invite is already live",
          highlights: [
            "Invite token + private email",
            "Short staged onboarding",
          ],
          primary: {
            href: "/register",
            label: "Join Beta",
          },
          secondary: {
            href: "/support",
            label: "Need Support",
          },
        }
      : {
          icon: LifeBuoy,
          eyebrow: "Have An Invite",
          title: "Coordinate early-access entry",
          body: "Beta entry still opens in small waves. Email support with your invite code and we will confirm the right path.",
          accent: "from-amber-300/20 via-amber-200/5 to-transparent",
          tempo: "Coordinated access while waves stay small",
          highlights: [
            "Invite code checked by support",
            "Onboarding opened in batches",
          ],
          primary: {
            href: "/support",
            label: "Request Access",
          },
          secondary: {
            href: "/download",
            label: "Check Downloads",
          },
        },
    authBootstrapEnabled
      ? {
          icon: KeyRound,
          eyebrow: "Already Have Access",
          title: "Sign in with the same private email",
          body: "Use the email tied to this account so the right sessions and recovery path follow you.",
          accent: "from-rose-300/18 via-rose-200/5 to-transparent",
          tempo: "Best when the account already exists",
          highlights: [
            "Same private email",
            "Support remains available if state drifts",
          ],
          primary: {
            href: "/login",
            label: "Sign In",
          },
          secondary: {
            href: "/support",
            label: "Recovery Help",
          },
        }
      : {
          icon: LifeBuoy,
          eyebrow: "Already Have Access",
          title: "Recover the right path quietly",
          body: "If access feels off, email support with your device label and the private email you used to register.",
          accent: "from-rose-300/18 via-rose-200/5 to-transparent",
          tempo: "Recovery and continuity",
          highlights: [
            "Share device label if blocked",
            "Use the original private email",
          ],
          primary: {
            href: "/support",
            label: "Email Support",
          },
          secondary: {
            href: "/trust-and-safety",
            label: "How It Works",
          },
        },
    {
      icon: Download,
      eyebrow: "Need A Client Build",
      title: "Check the posted clients",
      body: "See what is posted for Android, Windows, and Ubuntu when you want an installed client.",
      accent: "from-sky-300/16 via-sky-200/4 to-transparent",
      tempo: "Best when you want an installed client",
      highlights: [
        "Android build status",
        "Windows and Ubuntu releases",
      ],
      primary: {
        href: "/download",
        label: "View Launch Targets",
      },
      secondary: {
        href: "/support",
        label: "Ask A Question",
      },
    },
  ];
}

export function StartHereSummary() {
  const startPaths = getStartPaths();

  return (
    <aside className="section-spotlight relative overflow-hidden rounded-[2rem] p-6">
      <div
        className="pointer-events-none absolute right-0 top-0 h-44 w-44 bg-[radial-gradient(circle,rgba(255,163,104,0.16),transparent_65%)]"
        aria-hidden="true"
      />
      <div className="relative">
        <div className="eyebrow">Choose A Path</div>
        <h2 className="mt-5 text-balance font-display text-3xl font-semibold text-[var(--text-primary)]">
          Choose the shortest path and keep moving.
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          If you already know why you are here, one click should be enough.
        </p>
      </div>

      <div className="relative mt-6 space-y-3">
        {startPaths.map((path) => (
          <Link
            key={`${path.eyebrow}-${path.primary.href}`}
            href={path.primary.href}
            className="group relative block overflow-hidden rounded-[1.45rem] border border-white/8 bg-white/[0.03] px-4 py-4 transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-brand-500/25 hover:bg-white/[0.05]"
          >
            <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-r ${path.accent} opacity-80`} />
            <div className="relative">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-2.5 text-brand-400">
                  <path.icon aria-hidden="true" className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-400">
                      {path.eyebrow}
                    </p>
                    <span className="metric-pill px-2.5 py-0.5 text-[10px]">{path.tempo}</span>
                  </div>
                  <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{path.primary.label}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{path.body}</p>
                </div>
                <ArrowRight
                  aria-hidden="true"
                  className="mt-1 h-4 w-4 text-[#b9968f] transition-transform duration-200 group-hover:translate-x-1"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {path.highlights.slice(0, 2).map((item) => (
                  <span key={item} className="metric-pill">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}

export function StartHereGuide() {
  const startPaths = getStartPaths();

  return (
    <div className="space-y-6">
      {!authBootstrapEnabled ? (
        <StatusCallout
          tone="info"
          title="Entry is coordinated in small beta waves right now"
          className="border-white/10 bg-white/[0.04]"
        >
          Registration links are not being opened broadly on this deployment yet. You can still
          review the trust model, check the available builds, and email support with your invite
          code so the right path can be coordinated.
        </StatusCallout>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        {startPaths.map((path) => (
          <article key={`${path.eyebrow}-${path.title}`} className="card relative h-full overflow-hidden p-6">
            <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-r ${path.accent} opacity-90`} />
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] p-3 text-brand-400">
                  <path.icon aria-hidden="true" className="h-5 w-5" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-400">
                  {path.eyebrow}
                </p>
              </div>

              <h2 className="mt-4 text-balance text-2xl font-semibold text-[var(--text-primary)]">
                {path.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{path.body}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="metric-pill">{path.tempo}</span>
                {path.highlights.slice(0, 2).map((item) => (
                  <span key={item} className="metric-pill">
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-auto pt-6">
                <div className="flex flex-wrap gap-3">
                  <Link href={path.primary.href} className="btn-primary">
                    {path.primary.label}
                  </Link>
                  {path.secondary ? (
                    <Link href={path.secondary.href} className="btn-ghost">
                      {path.secondary.label}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <section className="section-spotlight rounded-[2rem] px-6 py-7">
          <div className="eyebrow">Typical Path</div>
          <h2 className="mt-5 text-balance font-display text-4xl font-semibold text-[var(--text-primary)]">
            Most people only need three moves.
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {startSteps.map((step) => (
              <div key={step.number} className="rounded-[1.5rem] border border-white/8 bg-white/[0.035] p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-500/25 bg-brand-500/10 text-sm font-semibold text-brand-300">
                  {step.number}
                </div>
                <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel px-6 py-7">
          <div className="eyebrow">Keep It Simple</div>
          <h2 className="mt-5 text-balance font-display text-4xl font-semibold text-[var(--text-primary)]">
            Keep the account state clean.
          </h2>
          <div className="mt-6 space-y-4">
            {[
              "Keep the same private email attached to invite, sign-in, and recovery.",
              "Give every device a readable name before you add it.",
              "If something feels unclear, ask support early instead of forcing the wrong flow.",
            ].map((item) => (
              <div key={item} className="signal-line">
                <span className="signal-dot" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/download" className="btn-ghost">
              Check Builds
            </Link>
            <Link href="/support" className="btn-ghost">
              Ask Support
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
