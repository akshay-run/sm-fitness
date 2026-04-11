export default function MembersLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="h-8 w-40 animate-pulse rounded bg-zinc-200/70" />
          <div className="mt-2 h-4 w-60 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-lg bg-zinc-200/70" />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="h-10 w-full animate-pulse rounded-xl bg-zinc-200/70 sm:max-w-md" />
        <div className="h-10 w-24 animate-pulse rounded-full bg-zinc-200/70" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="card-surface h-36 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-50 p-5"
          />
        ))}
      </div>
    </div>
  );
}
