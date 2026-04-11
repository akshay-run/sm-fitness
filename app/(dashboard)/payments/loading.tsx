export default function PaymentsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="h-8 w-40 animate-pulse rounded bg-zinc-200/70" />
          <div className="mt-2 h-4 w-60 animate-pulse rounded bg-zinc-100" />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="h-12 w-full animate-pulse border-b border-zinc-200 bg-zinc-100" />
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="flex h-16 w-full animate-pulse items-center gap-4 border-b border-zinc-100 bg-white px-4"
          >
            <div className="h-4 w-1/4 rounded bg-zinc-200/70" />
            <div className="h-4 w-1/5 rounded bg-zinc-200/70" />
            <div className="h-4 w-1/6 rounded bg-zinc-200/70" />
            <div className="h-6 w-12 rounded-full bg-zinc-200/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
