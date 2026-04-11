export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <div className="flex justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded bg-zinc-200/70" />
          <div className="h-4 w-56 animate-pulse rounded bg-zinc-200/60" />
        </div>
        <div className="h-10 w-28 shrink-0 animate-pulse rounded-lg bg-zinc-200/70" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="h-24 animate-pulse rounded-2xl border border-zinc-100 bg-zinc-200/70 p-4" />
        <div className="h-24 animate-pulse rounded-2xl border border-zinc-100 bg-zinc-200/70 p-4" />
        <div className="h-24 animate-pulse rounded-2xl border border-zinc-100 bg-zinc-200/70 p-4" />
        <div className="h-24 animate-pulse rounded-2xl border border-zinc-100 bg-zinc-200/70 p-4" />
      </div>

      <div className="card-surface mt-4 rounded-2xl border border-zinc-200 p-5">
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-200/70" />
        <div className="mt-3 h-9 w-40 animate-pulse rounded bg-zinc-200/70" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-zinc-200/60" />
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-zinc-200/50" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card-surface rounded-2xl border border-zinc-200 p-5">
          <div className="flex justify-between gap-2">
            <div className="h-4 w-48 animate-pulse rounded bg-zinc-200/70" />
            <div className="h-4 w-16 animate-pulse rounded bg-zinc-200/60" />
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
            <div className="h-9 animate-pulse bg-zinc-100/90" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-2 border-t border-zinc-100 px-3 py-3">
                <div className="h-4 flex-1 animate-pulse rounded bg-zinc-200/60" />
                <div className="h-4 w-16 animate-pulse rounded bg-zinc-200/50" />
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface rounded-2xl border border-zinc-200 p-5">
          <div className="flex justify-between gap-2">
            <div className="h-4 w-40 animate-pulse rounded bg-zinc-200/70" />
            <div className="h-4 w-28 animate-pulse rounded bg-zinc-200/60" />
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
            <div className="h-9 animate-pulse bg-zinc-100/90" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-2 border-t border-zinc-100 px-3 py-3">
                <div className="h-4 flex-1 animate-pulse rounded bg-zinc-200/60" />
                <div className="h-4 w-20 animate-pulse rounded bg-zinc-200/50" />
                <div className="h-4 w-14 animate-pulse rounded bg-zinc-200/50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
