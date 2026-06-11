export default function ProductsLoading() {
  return (
    <div className="bg-zinc-50/60 min-h-screen text-zinc-900 antialiased py-12 px-4 md:px-8 2xl:px-12 mx-auto sm:px-6 lg:px-8">
      {/* Header Skeleton */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200/80">
        <div className="space-y-3 w-full max-w-2xl">
          <div className="h-10 w-64 bg-zinc-200 animate-pulse rounded-lg" />
          <div className="h-4 w-full bg-zinc-200 animate-pulse rounded" />
          <div className="h-4 w-3/4 bg-zinc-200 animate-pulse rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-24 bg-zinc-200 animate-pulse rounded-lg" />
          <div className="h-9 w-40 bg-zinc-200 animate-pulse rounded-lg" />
          <div className="h-9 w-32 bg-zinc-200 animate-pulse rounded-lg" />
        </div>
      </div>

      {/* Content Structure */}
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-8 items-start">
        {/* Sidebar Skeleton */}
        <div className="hidden lg:flex flex-col gap-6">
          <div className="h-[500px] w-full bg-zinc-200 animate-pulse rounded-xl" />
          <div className="h-40 w-full bg-zinc-200 animate-pulse rounded-xl" />
        </div>

        {/* Products Grid Skeleton */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm h-full">
                <div className="aspect-square bg-zinc-200 animate-pulse" />
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-zinc-200 animate-pulse rounded" />
                    <div className="h-4 w-2/3 bg-zinc-200 animate-pulse rounded" />
                  </div>
                  <div className="h-5 w-1/3 bg-zinc-200 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
