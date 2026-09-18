import { MONO } from '../../adaptive-interview/components/primitives';

/**
 * Brand on the left, the chapter rail in the middle, the call to action on
 * the right. The rail doubles as navigation: any chapter can be jumped to.
 */
export default function TourTopBar({ chapters, currentId, visitedIds, onJump, bookingUrl, onBook }) {
  return (
    <header
      className="relative z-50 flex h-[52px] shrink-0 items-center gap-2 border-b px-3 sm:gap-4 sm:px-4 lg:px-5"
      style={{ background: 'var(--lp-ink)', borderColor: 'var(--lp-line)' }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <img src="/trudev_logo.svg" alt="" className="h-6 w-6 shrink-0" />
        <span className="hidden font-wordmark text-[17px] font-semibold tracking-[-0.01em] min-[420px]:inline" style={{ color: 'var(--lp-fg)' }}>
          TruDev
        </span>
        <span
          className="ml-1 hidden rounded-full px-2 py-[2px] text-[10px] uppercase sm:inline"
          style={{ fontFamily: MONO, letterSpacing: '0.1em', color: 'var(--lp-fg-faint)', border: '1px solid var(--lp-line)' }}
        >
          Product tour
        </span>
      </div>

      <nav aria-label="Tour chapters" className="flex min-w-0 flex-1 justify-center">
        <ol className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chapters.map((chapter, i) => {
            const active = chapter.id === currentId;
            const visited = visitedIds.has(chapter.id);
            return (
              <li key={chapter.id}>
                <button
                  type="button"
                  onClick={() => onJump(chapter.id)}
                  aria-current={active ? 'step' : undefined}
                  aria-label={chapter.label}
                  className="flex items-center gap-2 whitespace-nowrap rounded-full px-2 py-1.5 text-[12.5px] sm:px-3 font-medium transition-colors hover:bg-[rgba(255,240,230,0.06)]"
                  style={{
                    color: active ? 'var(--lp-fg)' : visited ? 'var(--lp-fg-dim)' : 'var(--lp-fg-faint)',
                    background: active ? 'rgba(255,133,40,0.12)' : undefined,
                    border: `1px solid ${active ? 'rgba(255,133,40,0.35)' : 'transparent'}`,
                  }}
                >
                  <span
                    className="grid h-[18px] w-[18px] place-items-center rounded-full text-[10px]"
                    style={{
                      fontFamily: MONO,
                      background: active || visited ? 'var(--lp-ember-bright)' : 'transparent',
                      color: active || visited ? '#180C03' : 'var(--lp-fg-faint)',
                      border: active || visited ? 'none' : '1px solid var(--lp-line)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="hidden lg:inline">{chapter.label}</span>
                  {/* Phones name only the chapter you're in; the rest are numbers. */}
                  <span className={active ? 'lg:hidden' : 'hidden sm:inline lg:hidden'}>{chapter.short || chapter.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className={bookingUrl ? 'shrink-0' : 'hidden shrink-0 sm:block'}>
        {bookingUrl ? (
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onBook}
            className="inline-flex h-8 items-center rounded-full px-3 text-[12.5px] font-semibold text-[#180C03] transition hover:brightness-110 sm:h-9 sm:px-4"
            style={{ background: 'linear-gradient(135deg, var(--lp-ember-soft), var(--lp-ember))' }}
          >
            <span className="sm:hidden">Book a call</span>
            <span className="hidden sm:inline">Book 20 minutes</span>
          </a>
        ) : (
          <span className="text-[11px]" style={{ fontFamily: MONO, color: 'var(--lp-fg-faint)' }}>
            ~3 min · no signup
          </span>
        )}
      </div>
    </header>
  );
}
