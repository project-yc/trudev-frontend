// Chapter 1 on a phone — the SAME workspace as the laptop, seen through a
// camera.
//
// The desktop stage (CodingChapter) needs ~900px for explorer, editor,
// terminal and AI chat side by side. Rather than redraw it as something that
// no longer looks like an IDE, it is rendered here at laptop size on a fixed
// canvas and ZoomStage moves over it: the whole IDE first, so the visitor sees
// what the candidate sees, then in on the pane where the story is happening.
// `view.focus` (set by every beat in tourScript.js) says which pane that is, so
// the camera pans to the terminal when the candidate runs a command and to the
// chat when they ask the AI. It is the real DOM underneath: panes scroll, the
// explorer opens files.
//
// The strip above is the camera control. A visitor can point it anywhere,
// including back out to the whole IDE; that choice holds until the story moves
// to another pane. The events TruDev captured live in the narrator column on
// desktop; there is none here, so they get the last tab plus a one-line ticker
// of the newest one.

import { useEffect, useState } from 'react';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'motion/react';

import { VSC } from '../../../recruiter/vscodeTheme.js';
import { MONO } from '../../adaptive-interview/components/primitives';
import SignalRail from '../components/SignalRail';
import ZoomStage from '../components/ZoomStage';
import CodingChapter, { GradeOverlay } from './CodingChapter';

// The laptop the workspace is drawn for. Narrow enough that the editor pane,
// once it fills a phone's width, keeps its code near real size.
const CANVAS = { width: 900, height: 620 };

const SHOTS = [
  { id: 'all', label: 'IDE', target: null },
  { id: 'code', label: 'Code', target: 'editor' },
  { id: 'terminal', label: 'Terminal', target: 'terminal' },
  { id: 'ai', label: 'AI', target: 'ai-chat' },
  { id: 'events', label: 'Events', target: null },
];

// How long the opening wide shot holds before the camera moves in.
const ESTABLISHING_MS = 1600;

export default function CodingChapterCompact({ view, company, role, stepKey }) {
  const reduce = useReducedMotion();

  const [established, setEstablished] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setEstablished(true), reduce ? 0 : ESTABLISHING_MS);
    return () => clearTimeout(id);
  }, [reduce]);

  // A tapped shot overrides the script only until the story moves on: a new
  // step, or a beat landing in a different pane.
  const [picked, setPicked] = useState({ at: null, id: null });
  const scope = `${stepKey}:${view.focus}`;
  const shotId = picked.at === scope ? picked.id : established ? view.focus : 'all';
  const shot = SHOTS.find(entry => entry.id === shotId) || SHOTS[0];
  // The events tab covers the stage; leave the camera where it was under it.
  const cameraTarget = shot.id === 'events'
    ? SHOTS.find(entry => entry.id === view.focus)?.target ?? null
    : shot.target;

  const latest = view.signals[view.signals.length - 1];

  return (
    <div className="flex h-full flex-col" style={{ background: VSC.editorBg, color: VSC.fg }}>
      <div role="tablist" aria-label="Workspace view" className="flex shrink-0 border-b" style={{ background: VSC.sidebarBg, borderColor: VSC.panelBorder }}>
        {SHOTS.map(({ id, label }) => {
          const active = id === shot.id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPicked({ at: scope, id })}
              className="relative flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 text-[12px] font-medium"
              style={{ color: active ? VSC.fgBright : '#8F8F8F', background: active ? VSC.tabActiveBg : 'transparent' }}
            >
              {active && <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: VSC.accent }} />}
              <span className="truncate">{label}</span>
              {id === 'events' && view.signals.length > 0 && (
                <span
                  className="rounded-full px-1.5 text-[10px] font-semibold tabular-nums"
                  style={{ background: 'rgba(255,133,40,0.18)', color: '#FFB27A' }}
                >
                  {view.signals.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Newest captured event. Hidden on the tab that already lists them. */}
      {latest && shot.id !== 'events' && (
        <button
          type="button"
          onClick={() => setPicked({ at: scope, id: 'events' })}
          className="flex h-7 shrink-0 items-center gap-2 border-b px-3 text-left"
          style={{ background: '#15110F', borderColor: VSC.panelBorder }}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#FF8528' }} />
          <span className="shrink-0 text-[10px] uppercase" style={{ fontFamily: MONO, letterSpacing: '0.1em', color: '#8F8F8F' }}>
            Captured
          </span>
          {/* Keyed, enter-only: events can land 150ms apart, and an exit
              animation queued behind each one left a stale name on screen. */}
          <Motion.span
            key={view.signals.length}
            initial={reduce ? false : { opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="min-w-0 flex-1 truncate text-[11px]"
            style={{ fontFamily: MONO, color: '#FFB27A' }}
          >
            {latest.name}
          </Motion.span>
          <span className="shrink-0 text-[10.5px] tabular-nums" style={{ fontFamily: MONO, color: '#8F8F8F' }}>{latest.at}</span>
        </button>
      )}

      <div className="relative min-h-0 flex-1">
        <ZoomStage width={CANVAS.width} height={CANVAS.height} target={cameraTarget} background="#0B0B0B">
          <CodingChapter view={view} company={company} role={role} stepKey={stepKey} fixed />
        </ZoomStage>

        {shot.id === 'events' && (
          <div
            data-insight-scroll
            className="absolute inset-0 z-10 overflow-y-auto px-4 py-4"
            style={{ background: 'var(--lp-surface)' }}
          >
            <SignalRail signals={view.signals} />
          </div>
        )}

        {/* Drawn here at phone size, not inside the scaled canvas. */}
        <AnimatePresence>{view.grade && <GradeOverlay grade={view.grade} />}</AnimatePresence>
      </div>
    </div>
  );
}
