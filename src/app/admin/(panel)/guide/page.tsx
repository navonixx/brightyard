import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { guideState } from "@/lib/data";
import { FUNNEL_MATH, GUIDE } from "@/lib/guide";
import { toggleGuideStep } from "../../actions";
import { GuideCheckbox } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";

export default function GuidePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Guide />
    </Suspense>
  );
}

async function Guide() {
  await requireAdmin();
  const state = await guideState();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">The 30-day playbook</h1>
        <p className="mt-2 text-muted">
          Goal: $100 in the first 30 days. Tick each step as you finish it — progress shows on the dashboard.
        </p>
      </div>

      <section className="card p-6">
        <h2 className="font-semibold">How $100 adds up (estimates, not a promise)</h2>
        <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
          {FUNNEL_MATH.map((row) => (
            <div key={row.label} className="rounded-xl bg-paper p-3">
              <dt className="text-xs text-muted">{row.label}</dt>
              <dd className="mt-1 font-display text-lg font-semibold">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted">
          What makes it work: every email links to <strong>a website already built for them</strong>. That gets far more replies than a generic
          &quot;we make websites&quot; pitch.
        </p>
      </section>

      {GUIDE.map((phase, index) => {
        const done = phase.steps.filter((s) => state[s.id]).length;
        return (
          <section key={phase.id}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl font-semibold">
                {index + 1}. {phase.title} <span className="text-sm font-medium text-muted">· {phase.days}</span>
              </h2>
              <span className="text-sm text-muted">
                {done}/{phase.steps.length}
              </span>
            </div>
            <p className="mb-3 text-sm text-muted">{phase.goal}</p>
            <ol className="card divide-y divide-line">
              {phase.steps.map((step) => (
                <li key={step.id} className="flex gap-4 p-5">
                  <GuideCheckbox
                    checked={Boolean(state[step.id])}
                    onToggle={toggleGuideStep.bind(null, step.id)}
                  />
                  <div className="min-w-0">
                    <p className={`font-medium ${state[step.id] ? "text-muted line-through" : ""}`}>
                      {step.day ? <span className="mr-2 text-xs font-semibold text-brand">{step.day}</span> : null}
                      {step.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
                    {step.link ? (
                      <Link href={step.link.href} className="mt-2 inline-block text-sm font-semibold text-brand">
                        {step.link.label} →
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
