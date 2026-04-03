import Link from "next/link";
import { StatusCallout } from "@/components/status-callout";
import { authBootstrapEnabled } from "@/lib/site";

type StartPath = {
  eyebrow: string;
  title: string;
  body: string;
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
    title: "Pick the right lane",
    body: "New visitors should start with the trust model. Invite holders should use the beta onboarding path. Existing users should sign in.",
  },
  {
    number: "02",
    title: "Use web for the fastest start",
    body: "The web app handles onboarding, direct messages, search, invite review, and settings. It is the easiest way to get moving quickly.",
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
      eyebrow: "New Here",
      title: "Understand the trust model first",
      body: "Start with what EmberChamber is, what it isn't, and where your data actually lives.",
      primary: {
        href: "/trust-and-safety",
        label: "Read Trust Model",
      },
      secondary: {
        href: "/download",
        label: "Check Downloads",
      },
    },
    authBootstrapEnabled
      ? {
          eyebrow: "Have An Invite",
          title: "Join beta in web first",
          body: "You'll need your invite token and private email address. The whole flow takes a few minutes.",
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
          eyebrow: "Have An Invite",
          title: "Have an invite code?",
          body: "Beta email links are issued in limited waves. Email support with your invite code and we'll confirm it's still active and coordinate your next step.",
          primary: {
            href: "/support",
            label: "Email Support",
          },
          secondary: {
            href: "/download",
            label: "Check Downloads",
          },
        },
    authBootstrapEnabled
      ? {
          eyebrow: "Already Have Access",
          title: "Return with your private email",
          body: "Sign in with the same private email you used to join.",
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
          eyebrow: "Already Have Access",
          title: "Trouble signing in?",
          body: "Email support with your device label and the private email you used to register. We'll get you back in.",
          primary: {
            href: "/support",
            label: "Email Support",
          },
          secondary: {
            href: "/trust-and-safety",
            label: "Review Trust Model",
          },
        },
    {
      eyebrow: "Need A Client Build",
      title: "Check native availability",
      body: "See what's posted for Android, Windows, and Ubuntu. The web app stays usable if nothing is listed for your platform yet.",
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
    <aside className="panel border-brand-500/15 bg-[linear-gradient(180deg,rgba(200,88,50,0.08),rgba(255,255,255,0.58))] p-6 shadow-[0_20px_60px_rgba(32,19,18,0.12)] dark:bg-[linear-gradient(180deg,rgba(234,111,63,0.16),rgba(27,18,19,0.92))]">
      <div className="eyebrow">Start Here</div>
      <h2 className="mt-5 text-balance font-display text-3xl font-semibold text-[var(--text-primary)]">
        Where do you want to start?
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        The web app covers onboarding, messaging, invite review, and settings. Native clients are
        there when you want the preferred daily experience.
      </p>

      <div className="mt-6 space-y-3">
        {startPaths.map((path) => (
          <Link
            key={`${path.eyebrow}-${path.primary.href}`}
            href={path.primary.href}
            className="block rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-4 transition-colors hover:border-brand-500/30 hover:bg-[var(--bg-secondary)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              {path.eyebrow}
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{path.primary.label}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{path.body}</p>
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
        <StatusCallout tone="info" title="Beta access is invite-only and limited right now">
          New sign-in and registration links are not being issued on this deployment yet. You can
          still read the trust model, check available builds, and email support to coordinate your
          invite.
        </StatusCallout>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {startPaths.map((path) => (
          <article key={`${path.eyebrow}-${path.title}`} className="card h-full">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              {path.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{path.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{path.body}</p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={path.primary.href} className="btn-primary">
                {path.primary.label}
              </Link>
              {path.secondary ? (
                <Link href={path.secondary.href} className="btn-ghost">
                  {path.secondary.label}
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="panel px-6 py-7">
          <div className="eyebrow">Typical Path</div>
          <h2 className="mt-5 text-balance font-display text-4xl font-semibold text-[var(--text-primary)]">
            Most people should follow these three moves.
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {startSteps.map((step) => (
              <div key={step.number} className="rounded-[1.45rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Step {step.number}
                </p>
                <h3 className="mt-2 text-base font-semibold text-[var(--text-primary)]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{step.body}</p>
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
            <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Browser Companion</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Start here for onboarding, invite review, direct messages, joined-space search,
                account recovery, and settings.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Android & Desktop</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Use posted native builds when you want the preferred primary experience, better
                device integration, and more headroom for heavier media use.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Support</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                If an invite, sign-in link, or build state is unclear, go to support instead of guessing.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
