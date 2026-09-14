import { motion as Motion, useReducedMotion } from 'motion/react';
import {
  Accent,
  ArrowIcon,
  DISPLAY,
  Eyebrow,
  GhostButton,
  MONO,
  PrimaryButton,
} from '../../adaptive-interview/components/primitives';

const PREVIEW = [
  ['01', 'The task', 'A real ticket in a real repo, with an AI assistant.'],
  ['02', 'The interview', 'Follow-up questions about the code they wrote.'],
  ['03', 'Your report', 'Rubric scores, AI usage, quotes and flags.'],
  ['04', 'More formats', 'MCQ, ranking, written answers and more interview modes.'],
];

export default function IntroScreen({ companyPhrase, role, narrow, onStart, onSkipToReport }) {
  const reduce = useReducedMotion();
  const rise = delay => (reduce ? {} : {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
  });

  return (
    <div className="relative h-full overflow-y-auto overflow-x-hidden">
      <div aria-hidden="true" className="lp-grid-bg pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div
        aria-hidden="true"
        className="lp-aurora pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(255,107,0,0.28), transparent)' }}
      />

      <div className="relative mx-auto flex min-h-full max-w-[980px] flex-col justify-center px-5 py-12 sm:px-8">
        <Motion.div {...rise(0)}>
          <Eyebrow>A 3-minute walkthrough · no signup</Eyebrow>
        </Motion.div>

        <Motion.h1
          {...rise(0.06)}
          className="mt-5 text-[clamp(2rem,5vw,3.6rem)] leading-[1.04]"
          style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '-0.035em', color: 'var(--lp-fg)' }}
        >
          Here&apos;s what a {role} candidate at {companyPhrase} would <Accent>actually</Accent> do.
        </Motion.h1>

        <Motion.p {...rise(0.12)} className="mt-5 max-w-[640px] text-[16px] leading-[1.68]" style={{ color: 'var(--lp-fg-dim)' }}>
          Not a LeetCode puzzle. A real bug in a real codebase with an AI assistant allowed, then an AI
          interview about the code they wrote, then the report you&apos;d get. Scripted, so you can click
          through it in three minutes.
        </Motion.p>

        <Motion.div {...rise(0.18)} className="mt-8 flex flex-wrap items-center gap-3">
          {narrow ? (
            <PrimaryButton onClick={onSkipToReport}>
              See the report <ArrowIcon />
            </PrimaryButton>
          ) : (
            <>
              <PrimaryButton onClick={onStart}>
                Walk through as a candidate · 3 min <ArrowIcon />
              </PrimaryButton>
              <GhostButton onClick={onSkipToReport}>Skip to the report · 45 sec</GhostButton>
            </>
          )}
        </Motion.div>

        {narrow && (
          <p className="mt-4 max-w-[480px] text-[12.5px] leading-[1.6]" style={{ color: 'var(--lp-fg-faint)' }}>
            The candidate&apos;s workspace needs a bigger screen. Open this link on a laptop to walk through
            the coding task and the interview too.
          </p>
        )}

        <Motion.ol {...rise(0.26)} className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PREVIEW.map(([n, title, line]) => (
            <li
              key={n}
              className="rounded-2xl p-4"
              style={{ background: 'linear-gradient(168deg, var(--lp-raised), var(--lp-surface))', border: '1px solid var(--lp-line)' }}
            >
              <p className="text-[10.5px]" style={{ fontFamily: MONO, letterSpacing: '0.14em', color: 'var(--lp-ember-bright)' }}>{n}</p>
              <p className="mt-2 text-[14px] font-semibold" style={{ color: 'var(--lp-fg)' }}>{title}</p>
              <p className="mt-1 text-[12.5px] leading-[1.55]" style={{ color: 'var(--lp-fg-dim)' }}>{line}</p>
            </li>
          ))}
        </Motion.ol>
      </div>
    </div>
  );
}
