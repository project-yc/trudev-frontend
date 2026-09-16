import { IconUser } from '@tabler/icons-react'
import { cn } from '../../../../lib/utils'
import aiAdaptiveIcon from '../../../../assets/icons/ai_adaptive_icon.svg'

// Both sides of the conversation get a gutter mark, so a long exchange stays
// readable as a dialogue rather than as two colours of rectangle. The
// interviewer's mark is the product's own AI Adaptive icon — a fixed identity
// for the bot itself, distinct from the org's brand (which the candidate
// already sees in the top bar via ExamBrand).
export default function ChatAvatar({ role, name }) {
  const initial = (name || '').trim().charAt(0).toUpperCase()

  if (role === 'ai') {
    return (
      <img
        src={aiAdaptiveIcon}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full border border-border-subtle object-cover"
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
        'border border-border bg-surface-raised text-text-secondary',
      )}
    >
      {initial
        ? <span className="text-[12px] font-semibold leading-none">{initial}</span>
        : <IconUser size={16} />}
    </span>
  )
}
