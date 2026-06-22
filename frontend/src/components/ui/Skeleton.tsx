import { cn } from '../../utils/helpers'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-slate-200 rounded-lg', className)} />
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}
