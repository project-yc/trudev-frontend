import { useId, useState } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import { cn } from '../../../../../lib/utils'
import SectionLabel from './SectionLabel'

// `tone` distinguishes a genuine error log from neutral monospace content. The
// error styling was hardcoded, so the memory aid — which shows a stuck candidate
// their OWN working code — framed it in a red error box.
const TONES = {
  error: 'border-error-border bg-error-bg',
  neutral: 'border-border-subtle bg-surface-muted',
}

export default function LogSection({ section }) {
  const [expanded, setExpanded] = useState(!!section.defaultExpanded)
  const panelId = useId()

  const lines = (Array.isArray(section.lines) ? section.lines : []).map((line) => String(line ?? ''))
  if (!lines.length) return null

  const body = TONES[section.tone] || TONES.error
  const hasMore = lines.length > 1

  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>{section.label}</SectionLabel>

      {/* Summary and detail are two separate blocks rather than one box that
          swells. The summary line stays a stable, clickable target in the same
          place whether the log is open or shut. */}
      <button
        type="button"
        onClick={() => hasMore && setExpanded((v) => !v)}
        disabled={!hasMore}
        aria-expanded={hasMore ? expanded : undefined}
        aria-controls={hasMore ? panelId : undefined}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface',
          'px-3.5 py-3 text-left transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
          hasMore ? 'hover:border-border hover:bg-surface-hover' : 'cursor-default',
        )}
      >
        <span className="min-w-0 truncate font-mono text-[12.5px] leading-[1.4] text-text-secondary">
          {lines[0]}
        </span>
        {hasMore && (
          <IconChevronDown
            size={16}
            aria-hidden="true"
            className={cn('shrink-0 text-text-muted transition-transform duration-200', expanded && 'rotate-180')}
          />
        )}
      </button>

      {hasMore && expanded && (
        <div
          id={panelId}
          className={cn('cand-scroll max-h-[280px] overflow-auto rounded-xl border px-3.5 py-3', body)}
        >
          <pre className="whitespace-pre font-mono text-[12.5px] leading-[1.55] text-text-secondary">
            {lines.join('\n')}
          </pre>
        </div>
      )}
    </section>
  )
}
