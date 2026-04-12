"use client";

export function FlowSteps({
  steps,
  currentStep,
  shortLabels,
}: {
  steps: string[];
  currentStep: number;
  /** Optional shorter labels for narrow screens (same length as `steps`). */
  shortLabels?: string[];
}) {
  return (
    <nav aria-label="Progress" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 sm:gap-0">
        {steps.map((label, i) => {
          const stepNum = i + 1;
          const done = stepNum < currentStep;
          const current = stepNum === currentStep;
          const short = shortLabels?.[i];
          return (
            <li key={label} className="flex min-w-0 flex-1 items-center sm:flex-initial sm:flex-none">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
                <span
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    done
                      ? "bg-zinc-900 text-white"
                      : current
                        ? "bg-zinc-900 text-white ring-2 ring-zinc-300 ring-offset-2"
                        : "border border-zinc-300 bg-white text-zinc-400",
                  ].join(" ")}
                  aria-current={current ? "step" : undefined}
                >
                  {done ? "✓" : stepNum}
                </span>
                <span
                  className={[
                    "truncate text-xs",
                    current ? "font-semibold text-zinc-900" : done ? "text-zinc-700" : "text-zinc-400",
                  ].join(" ")}
                >
                  <span className="md:hidden">{short ?? label}</span>
                  <span className="hidden md:inline">{label}</span>
                </span>
              </div>
              {i < steps.length - 1 ? (
                <div
                  className={[
                    "mx-1 hidden h-px w-6 shrink-0 sm:block md:mx-2 md:w-10",
                    stepNum < currentStep ? "bg-zinc-900" : "bg-zinc-200",
                  ].join(" ")}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
