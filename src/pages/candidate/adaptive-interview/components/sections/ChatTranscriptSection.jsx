import SectionLabel from './SectionLabel'

// Initials, not a blank disc. This is a group chat between named people the
// candidate is being asked to reason about, and six identical grey circles made
// the roster impossible to hold in your head while reading.
const initialsOf = (author) => String(author || '')
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part.charAt(0).toUpperCase())
  .join('')

export default function ChatTranscriptSection({ section }) {
  const messages = Array.isArray(section.messages) ? section.messages : []
  if (!messages.length) return null

  return (
    <section className="flex flex-col gap-2.5">
      <SectionLabel>{section.label}</SectionLabel>

      <div className="flex flex-col gap-3.5">
        {messages.map((message, i) => (
          <div key={i} className="flex gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-muted text-[10px] font-semibold leading-none text-text-secondary"
            >
              {initialsOf(message?.author)}
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-[12.5px] font-semibold leading-[1.3] text-text-primary">
                  {message?.author}
                </span>
                {message?.timestampLabel && (
                  <span className="shrink-0 text-[11.5px] leading-[1.3] text-text-faint">
                    {message.timestampLabel}
                  </span>
                )}
              </div>
              <p className="border-l-2 border-border pl-2.5 text-[12.5px] leading-[1.55] text-text-secondary">
                {message?.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
