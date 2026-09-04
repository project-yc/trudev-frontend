import { motion as Motion, useReducedMotion } from 'motion/react'
import ChatAvatar from './ChatAvatar'

export default function ChatBubbleCandidate({ text, candidateName, pending, hideAvatar }) {
  const reduceMotion = useReducedMotion()

  return (
    <Motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start justify-end gap-3"
    >
      <div
        className={
          'min-w-0 max-w-[82%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-brand ' +
          'px-4 py-3 text-[14px] leading-[1.65] text-on-brand shadow-[0_1px_2px_rgba(0,0,0,0.28)] ' +
          // In flight. Dimming the bubble the candidate can still read beats a
          // spinner beside it: it says "not landed yet" without implying the
          // answer might be lost, and it resolves the instant the POST returns.
          (pending ? 'opacity-70 transition-opacity duration-200' : '')
        }
      >
        <span className="sr-only">You: </span>
        {text}
      </div>

      {hideAvatar
        ? <span aria-hidden="true" className="h-9 w-9 shrink-0" />
        : <ChatAvatar role="candidate" name={candidateName} />}
    </Motion.div>
  )
}
