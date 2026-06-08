export default function ProductLoading() {
  return (
    <div className="bg-white min-h-screen">
      <div className="w-full px-4 md:px-8 2xl:px-12 mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
          {/* Image Skeleton */}
          <div className="aspect-square bg-zinc-200 animate-pulse rounded-2xl" />

          {/* Details Skeleton */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="h-4 w-32 bg-zinc-200 animate-pulse rounded" />
              <div className="h-10 w-full bg-zinc-200 animate-pulse rounded-lg" />
              <div className="h-10 w-2/3 bg-zinc-200 animate-pulse rounded-lg" />
            </div>

            <div className="h-8 w-40 bg-zinc-200 animate-pulse rounded-lg" />

            <div className="space-y-4 pt-6 border-t border-zinc-100">
              <div className="h-12 w-full bg-zinc-200 animate-pulse rounded-xl" />
              <div className="h-12 w-full bg-zinc-200 animate-pulse rounded-xl" />
            </div>

            <div className="space-y-2 pt-6">
              <div className="h-4 w-full bg-zinc-200 animate-pulse rounded" />
              <div className="h-4 w-5/6 bg-zinc-200 animate-pulse rounded" />
              <div className="h-4 w-4/6 bg-zinc-200 animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
