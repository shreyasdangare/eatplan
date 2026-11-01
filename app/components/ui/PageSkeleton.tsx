/** Server-rendered placeholder shown by route loading.tsx files while a page streams in. */
export function PageSkeleton({ rows = 5, tiles = false }: { rows?: number; tiles?: boolean }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse space-y-4 py-2">
      <div className="h-8 w-48 rounded-xl bg-stone-200/80 dark:bg-stone-700/60" />
      {tiles ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-2xl bg-stone-200/80 dark:bg-stone-700/60" />
          ))}
        </div>
      ) : (
        Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-14 rounded-2xl bg-stone-200/80 dark:bg-stone-700/60" />
        ))
      )}
    </div>
  );
}
