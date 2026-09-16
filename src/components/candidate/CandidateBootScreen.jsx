// ─────────────────────────────────────────────────────────────────────────────
// CandidateBootScreen — waiting for the coding workspace.
//
// This used to be a 19.5-second scripted animation in cyan-on-navy: six fake
// stages on fixed timers, a progress bar that reached 100% and stopped, and a
// log of invented lines. Against a real Fargate cold start (which the page
// waits up to three minutes for) it told the candidate the workspace was ready
// while nothing was happening — the one moment in the flow where a candidate is
// most likely to assume something has broken and close the tab.
//
// It now reports what is actually known. `stage` comes from the page's own boot
// state machine, the elapsed clock is real, and the log is written by real
// transitions and real readiness probes. Nothing here advances on a timer.
//
// The palette is the candidate palette, so this no longer drops the candidate
// into a different product halfway through the flow.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import { motion as Motion, useReducedMotion } from 'motion/react'
import { IconCheck, IconTerminal2 } from '@tabler/icons-react'
import { cn } from '../../lib/utils'

// The stages the page can actually distinguish, in order. `key` is what the
// page passes as `stage`; everything before it reads as done, everything after
// as pending.
const BOOT_STAGES = [
  {
    key: 'authenticating',
    label: 'Session verified',
    detail: 'Your invite and section token checked out.',
  },
  {
    key: 'provisioning',
    label: 'Requesting your workspace',
    detail: 'Asking for an isolated container on your assessment.',
  },
  {
    key: 'waiting',
    label: 'Container starting',
    detail: 'A cold start can take a couple of minutes. Nothing is wrong.',
  },
  {
    key: 'entering',
    label: 'Opening the editor',
    detail: 'Handing you over to your workspace.',
  },
]

const STAGE_INDEX = Object.fromEntries(BOOT_STAGES.map((stage, index) => [stage.key, index]))

function formatElapsed(ms) {
  const total = Math.max(Math.floor((ms || 0) / 1000), 0)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function StageRow({ stage, state }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3.5 transition-opacity duration-300',
        state === 'pending' ? 'opacity-35' : 'opacity-100',
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {state === 'done' ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-brand-border bg-brand-tint">
            <IconCheck size={11} strokeWidth={3} className="text-brand-deep" />
          </span>
        ) : state === 'active' ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-border-strong border-t-brand" />
        ) : (
          <span className="h-5 w-5 rounded-full border border-border" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-[13px] font-semibold leading-tight transition-colors duration-200',
            state === 'done'
              ? 'text-text-secondary'
              : state === 'active'
                ? 'text-text-primary'
                : 'text-text-faint',
          )}
        >
          {stage.label}
        </p>
        {state === 'active' && (
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-text-muted">{stage.detail}</p>
        )}
      </div>

      {state === 'done' && (
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-text-faint">
          done
        </span>
      )}
    </div>
  )
}

/**
 * @param stage      one of BOOT_STAGES[].key — the furthest point actually reached.
 * @param elapsedMs  real time since the boot began.
 * @param logLines   strings appended by the page as real things happen.
 * @param maxWaitMs  the page's give-up point, quoted so the wait has an end.
 */
export function CandidateBootScreen({
  stage = 'authenticating',
  elapsedMs = 0,
  logLines = [],
  maxWaitMs,
}) {
  const reduceMotion = useReducedMotion()
  const logRef = useRef(null)
  const activeIndex = STAGE_INDEX[stage] ?? 0

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logLines])

  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-col gap-7 py-6">
      <Motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-2.5 text-center"
      >
        <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-tint px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-deep">
            Preparing workspace
          </span>
        </span>
        <h1 className="text-[24px] font-semibold leading-[1.2] tracking-[-0.025em] text-text-primary">
          Building your environment
        </h1>
        <p className="text-[13.5px] leading-relaxed text-text-secondary">
          We are starting a private container just for you. This usually takes under a minute,
          and can take a few on a cold start — leave this tab open.
        </p>
      </Motion.div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {/* Indeterminate on purpose. The wait is a container cold start whose
            length we genuinely do not know, and a bar that fills to 100% and
            then sits there is worse than no bar at all. */}
        <div className="relative h-[2px] w-full overflow-hidden bg-border-subtle">
          <span className="boot-rail absolute inset-y-0 w-1/3 bg-ember" />
        </div>

        <div className="flex flex-col gap-3.5 px-5 py-5">
          {BOOT_STAGES.map((entry, index) => (
            <StageRow
              key={entry.key}
              stage={entry}
              state={index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending'}
            />
          ))}
        </div>

        <div className="border-t border-border-subtle bg-surface-muted">
          <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-2">
            <IconTerminal2 size={13} className="text-text-faint" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
              system log
            </span>
          </div>
          <div
            ref={logRef}
            className="cand-scroll h-28 overflow-y-auto px-4 py-3"
            aria-live="polite"
          >
            {logLines.length === 0 ? (
              <p className="font-mono text-[11px] leading-relaxed text-text-faint">
                waiting for the first event…
              </p>
            ) : (
              logLines.map((line, index) => (
                <p
                  key={`${index}-${line}`}
                  className="font-mono text-[11px] leading-relaxed text-text-muted"
                >
                  {line}
                </p>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border-subtle px-5 py-3.5">
          <span className="text-[11.5px] text-text-muted">
            {BOOT_STAGES[activeIndex]?.label ?? 'Working'}…
          </span>
          <span className="font-mono text-[11.5px] tabular-nums text-text-secondary">
            {formatElapsed(elapsedMs)}
            {maxWaitMs ? (
              <span className="text-text-faint"> / {formatElapsed(maxWaitMs)} max</span>
            ) : null}
          </span>
        </div>
      </div>
    </div>
  )
}

export default CandidateBootScreen
