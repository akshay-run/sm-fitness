export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <div className="h-8 w-40 animate-pulse rounded bg-zinc-200/70" />
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="h-24 animate-pulse rounded-2xl bg-zinc-200/70" />
        <div className="h-24 animate-pulse rounded-2xl bg-zinc-200/70" />
        <div className="h-24 animate-pulse rounded-2xl bg-zinc-200/70" />
        <div className="h-24 animate-pulse rounded-2xl bg-zinc-200/70" />
      </div>
      <div className="mt-4 h-28 animate-pulse rounded-2xl bg-zinc-200/70" />
      <div className="mt-4 h-52 animate-pulse rounded-2xl bg-zinc-200/70" />
    </div>
  );
}

