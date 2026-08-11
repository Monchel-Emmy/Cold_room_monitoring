export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-20 rounded-2xl bg-slate-800/60 border border-slate-700/50" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-800/60 border border-slate-700/50" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-800/60 border border-slate-700/50" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-12 rounded-xl bg-slate-800/60 border border-slate-700/50" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-800/60 border border-slate-700/50" />
        ))}
      </div>
    </div>
  );
}
