export default function ReportsLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="h-8 w-32 animate-pulse rounded bg-zinc-200/70" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-10 w-28 animate-pulse rounded-lg bg-zinc-200/70" />
      </div>

      <div className="mt-6 h-12 w-full animate-pulse rounded-xl bg-amber-50" />

      <div className="mt-6 h-[400px] w-full animate-pulse rounded-2xl bg-zinc-100" />
    </div>
  );
}
