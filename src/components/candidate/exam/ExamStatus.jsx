// ─────────────────────────────────────────────────────────────────────────────
// ExamStatus — the run indicators in the top bar.
//
// Everything here answers a question the candidate would otherwise have to ask
// mid-exam: is my work saved, am I still online, can I get more room. Nothing
// here is decorative; if it can't change state, it isn't in the bar.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import {
  IconMaximize,
  IconMinimize,
  IconWifi,
  IconWifiOff,
} from '@tabler/icons-react'
import { cn } from '../../../lib/utils'

// ── Autosave ─────────────────────────────────────────────────────────────────
// `savedAt` is a timestamp that changes whenever answers are persisted. Keying
// the dot on it remounts the element, which replays the CSS pulse — a save
// acknowledgement with no state and no effect to keep in sync.
export function AutoSaveChip({ savedAt }) {
  return (
    <div className="hidden items-center gap-2 md:flex">
      <span
        key={savedAt}
        aria-hidden="true"
        className={cn('h-1.5 w-1.5 rounded-full bg-ember', savedAt && 'autosave-pulse')}
      />
      <span className="text-[12px] text-text-muted">Auto-saved</span>
    </div>
  )
}

// ── Connection ───────────────────────────────────────────────────────────────
export function ConnectionStatus() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  return (
    <span
      title={online ? 'Connected' : 'No connection. Your typed text stays on screen; reconnect before sending'}
      className={cn('flex h-8 w-8 items-center justify-center rounded-lg', online ? 'text-text-muted' : 'text-error')}
    >
      {online ? <IconWifi size={16} /> : <IconWifiOff size={16} />}
      <span className="sr-only">{online ? 'Connected' : 'Offline'}</span>
    </span>
  )
}

// ── Fullscreen ───────────────────────────────────────────────────────────────
export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const sync = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {isFullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
    </button>
  )
}

// ── Org identity ─────────────────────────────────────────────────────────────
// `subtitle` names what the candidate is actually sitting in front of. On a
// multi-section assessment the org name alone is the same on every screen, so
// it answers "whose assessment is this" and nothing about "which part am I on".
export function ExamBrand({ branding, fallback, subtitle }) {
  const { logo_url, candidate_name } = branding || {}
  const name = candidate_name || fallback
  // Never print the section name twice when it is standing in for the org.
  const secondary = subtitle && subtitle !== name ? subtitle : null

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {logo_url && (
        <img src={logo_url} alt="" className="h-7 w-auto shrink-0 object-contain" />
      )}
      <div className="flex min-w-0 flex-col justify-center">
        <span className="truncate text-[15px] font-bold leading-[1.25] tracking-[-0.01em] text-brand">
          {name}
        </span>
        {secondary && (
          <span className="hidden truncate text-[12px] leading-[1.3] text-text-muted sm:block">
            {secondary}
          </span>
        )}
      </div>
    </div>
  )
}
