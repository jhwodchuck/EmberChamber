import { onboardingSteps } from "@/lib/onboarding";

export function AuthPageIntro({
  eyebrow,
  title,
  description,
  emphasis,
}: {
  eyebrow: string;
  title: string;
  description: string;
  emphasis: string;
}) {
  return (
    <div className="max-w-3xl">
      <div className="eyebrow">{eyebrow}</div>
      <h1 className="mt-5 font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
        {title}
      </h1>
      <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">{description}</p>

      <div className="mt-8 rounded-[1.7rem] border border-brand-500/15 bg-brand-500/5 px-5 py-4">
        <p className="text-sm font-medium text-[var(--text-primary)]">{emphasis}</p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {onboardingSteps.map((step) => (
          <div
            key={step.number}
            className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">{step.number}</div>
            <h2 className="mt-3 text-base font-semibold text-[var(--text-primary)]">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{step.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
        Email stays private. Display names take over once you are inside.
      </p>
    </div>
  );
}
