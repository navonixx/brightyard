export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded-lg bg-line/60" />
      <div className="h-32 rounded-2xl bg-line/40" />
      <div className="h-64 rounded-2xl bg-line/40" />
    </div>
  );
}
