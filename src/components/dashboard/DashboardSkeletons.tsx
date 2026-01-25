import { Skeleton } from "@/components/ui/skeleton";

// Metric Card Skeleton - matches MetricCard layout
export function MetricCardSkeleton() {
  return (
    <div className="card-flat">
      <Skeleton className="h-10 w-24 mb-1" />
      <Skeleton className="h-3 w-20 mt-2" />
      <div className="mt-2 flex items-center gap-2">
        <Skeleton className="flex-1 h-1" />
        <Skeleton className="h-3 w-8" />
      </div>
      <Skeleton className="h-3 w-16 mt-1" />
    </div>
  );
}

// Yearly Results Board Skeleton
export function YearlyResultsBoardSkeleton() {
  return (
    <section>
      <Skeleton className="h-4 w-48 mb-4" />
      <div className="card-flat p-4">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header row */}
            <div className="flex gap-2 mb-3 pb-2 border-b border-border">
              <Skeleton className="h-4 w-20" />
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-12 flex-1" />
              ))}
              <Skeleton className="h-4 w-16" />
            </div>
            {/* Data rows */}
            {Array.from({ length: 4 }).map((_, row) => (
              <div key={row} className="flex gap-2 py-2">
                <Skeleton className="h-4 w-20" />
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 flex-1" />
                ))}
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Collapsible Actions Section Skeleton
export function ActionsListSkeleton() {
  return (
    <div className="border border-border">
      <div className="w-full p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

// Consultant Card Skeleton
export function ConsultantCardSkeleton() {
  return (
    <div className="card-flat">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="space-y-3">
        {/* Primary metrics */}
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between items-baseline">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-1.5 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
        ))}
        {/* Category breakdown */}
        <div className="pt-2 border-t border-border">
          <Skeleton className="h-2 w-16 mb-2" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Collaborators Section Skeleton
export function CollaboratorsSectionSkeleton() {
  return (
    <section>
      <Skeleton className="h-4 w-48 mb-4" />
      {/* Area groups */}
      {Array.from({ length: 2 }).map((_, areaIndex) => (
        <div key={areaIndex} className="mb-6">
          <Skeleton className="h-3 w-24 mb-3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <ConsultantCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

// Full Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* General Metrics */}
      <section>
        <Skeleton className="h-4 w-28 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </section>

      {/* Yearly Results Board */}
      <YearlyResultsBoardSkeleton />

      {/* Actions List */}
      <ActionsListSkeleton />

      {/* Collaborators Section */}
      <CollaboratorsSectionSkeleton />
    </div>
  );
}

// Loading timeout message component
export function LoadingTimeoutMessage() {
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
      <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
      <span className="text-xs tracking-widest uppercase">Carregando dados…</span>
    </div>
  );
}
