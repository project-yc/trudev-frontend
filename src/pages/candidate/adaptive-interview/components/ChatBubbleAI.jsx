import { motion as Motion, useReducedMotion } from 'motion/react'
import ChatAvatar from './ChatAvatar'

export default function ChatBubbleAI({ text, isNudge, hideAvatar }) {
  const reduceMotion = useReducedMotion()

  return (
    <Motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-3"
    >
      {hideAvatar
        ? <span aria-hidden="true" className="h-9 w-9 shrink-0" />
        : <ChatAvatar role="ai" />}

      <div className="flex min-w-0 max-w-[82%] flex-col items-start gap-1">
        {/* A nudge is a follow-up on the question already answered, not a new
            one. Unlabelled it reads as the interview having gone backwards —
            candidates re-answered the original question in full. */}
        {isNudge && (
          <span className="pl-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            Follow-up
          </span>
        )}
        <div
          className={
            'whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-surface-raised ' +
            'px-4 py-3 text-[14px] leading-[1.65] text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.28)]'
          }
        >
          <span className="sr-only">{isNudge ? 'Interviewer follow-up: ' : 'Interviewer: '}</span>
          {text}
        </div>
      </div>
    </Motion.div>
  )
}
