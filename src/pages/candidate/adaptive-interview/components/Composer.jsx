import { useEffect, useLayoutEffect, useRef } from 'react'
import { IconArrowUp, IconMicrophone, IconPlayerStopFilled } from '@tabler/icons-react'
import { cn } from '../../../../lib/utils'

// Engine rejects answers over 65,536 chars with a 422; cap slightly below so a
// giant paste is trimmed client-side instead of erroring after send.
export const MAX_ANSWER_CHARS = 65000
const COUNTER_THRESHOLD = 60000

// The box starts at roughly three lines and grows to about eight before it
// scrolls internally. Past that it would eat the transcript it is a reply to.
const MIN_TEXTAREA_PX = 76
const MAX_TEXTAREA_PX = 208

// Auto-size. A fixed two-row box hid the top of any answer longer than a
// sentence or two, and this is the longest free text in the product — the
// candidate could not re-read what they had written before sending it.
const sizeToContent = (el) => {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(Math.max(el.scrollHeight, MIN_TEXTAREA_PX), MAX_TEXTAREA_PX)}px`
  el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_PX ? 'auto' : 'hidden'
}

export default function Composer({
  value,
  onChange,
  onSend,
  disabled,
  inputRef,
  dictation,
}) {
  const localRef = useRef(null)
  const textareaRef = inputRef || localRef

  useLayoutEffect(() => { sizeToContent(textareaRef.current) }, [value, textareaRef])

  // Re-measure once the page has actually settled, and again whenever the
  // column changes width.
  //
  // The mount pass is not optional. `scrollHeight` is only meaningful after the
  // element's own CSS has applied, and on the first commit of a dev build it
  // has not — Vite injects the stylesheet from JS — so the textarea measured as
  // a UA-default control stretched by its flex parent and opened at the full
  // eight-row maximum. It corrected itself on the first keystroke, which is
  // exactly the wrong moment to watch the box jump.
  //
  // Width matters for the same reason: the same text wraps into a different
  // number of lines at a different width, so a window resize leaves the height
  // stale without this.
  useEffect(() => {
    const run = () => sizeToContent(textareaRef.current)
    const frame = requestAnimationFrame(run)
    window.addEventListener('resize', run)
    // Web fonts change the line box, and they land after first paint.
    document.fonts?.ready?.then(run).catch(() => {})
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', run)
    }
  }, [textareaRef])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSend()
    }
  }

  const listening = Boolean(dictation?.listening)
  // Interim speech is shown as a ghost line under the box rather than written
  // into the textarea: recognition rewrites the tail of a phrase as it refines
  // it, so streaming it into an editable field fights whatever the candidate is
  // typing and moves their cursor. Only finalized phrases get committed.
  const interim = dictation?.interim?.trim()
  const canSend = !disabled && Boolean(value.trim())

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'interview-composer-surface relative flex items-start gap-2 rounded-2xl p-2.5 transition-shadow duration-200',
          'focus-within:border-brand-border focus-within:shadow-[0_0_0_3px_var(--color-ember-wash)]',
          disabled && 'opacity-60',
          listening && 'border-brand-border shadow-[0_0_0_3px_var(--color-ember-wash)]',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          maxLength={MAX_ANSWER_CHARS}
          aria-label="Your answer"
          placeholder={
            listening
              ? 'Listening — speak, then edit anything that came out wrong...'
              : 'Type your answer — plain, informal language is fine...'
          }
          style={{ minHeight: MIN_TEXTAREA_PX, maxHeight: MAX_TEXTAREA_PX }}
          className={cn(
            'cand-scroll flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] leading-[1.6]',
            'text-text-primary placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed',
          )}
        />

        {/* Top-aligned so the controls hold still while the box grows downward. */}
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          {dictation?.supported && (
            <button
              type="button"
              onClick={dictation.toggle}
              disabled={disabled}
              aria-pressed={listening}
              aria-label={listening ? 'Stop voice input' : 'Answer using your voice'}
              title={listening ? 'Stop voice input' : 'Answer using your voice'}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                listening
                  ? 'cand-mic-live bg-brand text-on-brand'
                  : 'bg-surface-raised text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              {listening ? <IconPlayerStopFilled size={15} /> : <IconMicrophone size={17} />}
            </button>
          )}

          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            aria-label="Send response"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-on-brand',
              'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              canSend ? 'shadow-ember-tight hover:bg-brand-hover active:scale-95' : 'opacity-40',
            )}
          >
            <IconArrowUp size={18} stroke={2.2} />
          </button>
        </div>
      </div>

      {/* One reserved line for every below-the-box message, so committing a
          dictated phrase or hitting an error never shifts the composer. */}
      <div className="flex min-h-[18px] items-start justify-between gap-3 px-1">
        <p className="text-[12px] leading-[1.5] text-text-faint">
          {dictation?.error ? (
            <span role="alert" className="text-warning">{dictation.error}</span>
          ) : listening ? (
            <span aria-live="polite" className="text-text-muted">{interim || 'Listening...'}</span>
          ) : (
            <>
              Press Enter to send | Shift + Enter for a new line
              {dictation?.supported && ' | Tap the mic to speak instead'}
            </>
          )}
        </p>

        {value.length >= COUNTER_THRESHOLD && (
          <span className="shrink-0 font-mono text-[12px] leading-[1.5] text-text-faint">
            {value.length.toLocaleString()} / {MAX_ANSWER_CHARS.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}
