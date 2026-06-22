import { scoreColor, scoreBg } from '../../utils/helpers'
import { cn } from '../../utils/helpers'

interface ScoreBarProps { score: number; showLabel?: boolean; className?: string }

export function ScoreBar({ score, showLabel = true, className }: ScoreBarProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={cn('h-2 rounded-full transition-all', scoreBg(score))}
          style={{ width: `${score}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn('text-sm font-semibold w-10 text-right', scoreColor(score))}>
          {score}
        </span>
      )}
    </div>
  )
}
