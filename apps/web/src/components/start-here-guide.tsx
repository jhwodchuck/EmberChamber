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
    title: "Start with the web app",
    body: "The browser handles everything you need first: joining an invite, sending messages, and getting a feel for how it works. No install required.",
  },
  {
    number: "02",
    title: "Get onboarded, then explore",
    body: "Once your invite is in, set up your first conversation. The web app covers messages, search, and settings without needing a download.",
  },
  {
    number: "03",
    title: "Install native for primary use",
    body: "Once access is set up, move to Android, Windows, or Ubuntu when you want the preferred daily-use surface for longer sessions and heavier media.",
  },
] as const;

function getStartPaths(): StartPath[] {
  return [
    {
      icon: Compass,
      eyebrow: "New Here",
      title: "See how EmberChamber works",
      body: "Start with what EmberChamber is, what it isn&apos;t, and where your data actually lives. Then decide if it&apos;s right for your circle.",
      accent: "from-brand-500/20 via-brand-500/5 to-transparent",
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
          title: "Join beta in web first",
          body: "You&apos;ll need your invite token and private email address. The whole flow takes a few minutes.",
          accent: "from-amber-300/20 via-amber-200/5 to-transparent",
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
          title: "Request early access",
          body: "Beta waves are limited. Email us your invite code and we&apos;ll confirm it&apos;s active and coordinate your onboarding slot.",
          accent: "from-amber-300/20 via-amber-200/5 to-transparent",
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
          title: "Return with your private email",
          body: "Sign in with the same private email you used to join.",
          accent: "from-rose-300/18 via-rose-200/5 to-transparent",
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
          title: "Trouble signing in?",
          body: "Email support with your device label and the private email you used to register. We&apos;ll get you back in.",
          accent: "from-rose-300/18 via-rose-200/5 to-transparent",
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
      title: "Check native availability",
      body: "See what&apos;s posted for Android, Windows, and Ubuntu. The web app stays usable if nothing is listed for your platform yet.",
      accent: "from-sky-300/16 via-sky-200/4 to-transparent",
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
          Start quietly, then move deeper when you want to stay.
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          The browser gets you in fast. Native clients are there when EmberChamber becomes a daily
          surface instead of a quick visit.
        </p>
      </div>

      <div className="relative mt-6 space-y-3">
        {startPaths.map((path) => (
          <Link
            key={`${path.eyebrow}-${path.primary.href}`}
            href={path.primary.href}
            className="group relative block overflow-hidden rounded-[1.45rem] border border-white/8 bg-white/[0.03] px-4 py-4 transition-[border-color,background-color] hover:border-brand-500/25 hover:bg-white/[0.05]"
          >
            <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-r ${path.accent} opacity-80`} />
            <div className="relative flex items-start gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-2.5 text-brand-400">
                <path.icon aria-hidden="true" className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-400">
                  {path.eyebrow}
                </p>
                <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{path.primary.label}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{path.body}</p>
              </div>
              <ArrowRight
                aria-hidden="true"
                className="mt-1 h-4 w-4 text-[#b9968f] transition-transform duration-200 group-hover:translate-x-1"
              />
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
          title="Beta access is invite-only and limited right now"
          className="border-white/10 bg-white/[0.04]"
        >
          New sign-in and registration links are not being issued on this deployment yet. You can
          still explore how it works, check available builds, and email support to coordinate your
          invite.
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

              <h2 className="mt-5 text-balance text-2xl font-semibold text-[var(--text-primary)]">
                {path.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{path.body}</p>

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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <section className="section-spotlight rounded-[2rem] px-6 py-7">
          <div className="eyebrow">Typical Path</div>
          <h2 className="mt-5 text-balance font-display text-4xl font-semibold text-[var(--text-primary)]">
            Most people should follow these three moves.
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {startSteps.map((step, index) => (
              <div key={step.number} className="relative rounded-[1.5rem] border border-white/8 bg-white/[0.035] p-4">
                {index < startSteps.length - 1 ? (
                  <div
                    className="pointer-events-none absolute left-[calc(100%-0.75rem)] top-6 hidden h-px w-[calc(100%+0.5rem)] bg-gradient-to-r from-brand-500/30 to-transparent sm:block"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-500/25 bg-brand-500/10 text-sm font-semibold text-brand-300">
                    {step.number}
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">{step.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel px-6 py-7">
          <div className="eyebrow">Surface Split</div>
          <h2 className="mt-5 text-balance font-display text-4xl font-semibold text-[var(--text-primary)]">
            Know which surface does what.
          </h2>
          <div className="mt-6 space-y-4">
            {[
              {
                title: "Browser Companion",
                body: "Best for onboarding, invite review, direct messages, joined-space search, recovery, and settings.",
              },
              {
                title: "Android & Desktop",
                body: "Move here when you want the preferred primary experience, device integration, and more headroom for longer sessions.",
              },
              {
                title: "Support",
                body: "If invite state, sign-in, or build availability is unclear, ask support instead of guessing.",
              },
            ].map((surface) => (
              <div key={surface.title} className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-4">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{surface.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{surface.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
