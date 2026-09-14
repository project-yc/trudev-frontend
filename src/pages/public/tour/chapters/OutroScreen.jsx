import { Link } from 'react-router-dom';
import {
  Accent,
  ArrowIcon,
  DISPLAY,
  Eyebrow,
  GhostButton,
} from '../../adaptive-interview/components/primitives';

const RECAP = [
  ['Real repos, AI allowed', 'You see how candidates work with the tools they will actually use on the job.'],
  ['Hidden tests + an interview about their own code', 'A pasted solution passes the visible tests and then comes apart.'],
  ['Evidence, not a verdict', 'Rubric scores, quotes and review flags, so the decision stays yours.'],
];

const primaryClass = 'group inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13.5px] font-semibold text-[#180C03] transition-all duration-200 hover:brightness-110 active:scale-[0.98]';
const primaryStyle = {
  background: 'linear-gradient(135deg, var(--lp-ember-soft), var(--lp-ember))',
  boxShadow: '0 12px 30px -12px rgba(255, 107, 0, 0.7)',
};

export default function OutroScreen({ role, bookingUrl, liveDemoSlug, onCta, onReplay }) {
  return (
    <div className="relative h-full overflow-y-auto overflow-x-hidden">
      <div aria-hidden="true" className="lp-grid-bg pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_bottom,black,transparent_70%)]" />

      <div className="relative mx-auto flex min-h-full max-w-[900px] flex-col justify-center px-5 py-12 sm:px-8">
        <Eyebrow>That&apos;s the tour</Eyebrow>
        <h2
          className="mt-5 text-[clamp(1.9rem,4.4vw,3.2rem)] leading-[1.06]"
          style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--lp-fg)' }}
        >
          Want this for your <Accent>{role}</Accent> hiring?
        </h2>
        <p className="mt-5 max-w-[620px] text-[16px] leading-[1.68]" style={{ color: 'var(--lp-fg-dim)' }}>
          We&apos;ll set up a task in your stack and run your next candidate through it, so you can read a
          report like Priya&apos;s about someone you&apos;re actually hiring.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {bookingUrl ? (
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onCta('book_call')}
              className={primaryClass}
              style={primaryStyle}
            >
              Book 20 minutes <ArrowIcon />
            </a>
          ) : (
            <p className="rounded-full px-5 py-3 text-[13.5px] font-semibold" style={{ ...primaryStyle, color: '#180C03' }}>
              Reply to the email that brought you here and we&apos;ll set it up
            </p>
          )}
          {liveDemoSlug && (
            <Link
              to={`/demo/${encodeURIComponent(liveDemoSlug)}`}
              onClick={() => onCta('live_demo')}
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13.5px] font-semibold transition-all duration-200 hover:bg-[rgba(255,240,230,0.07)]"
              style={{ border: '1px solid var(--lp-line)', color: 'var(--lp-fg)' }}
            >
              Take the real assessment yourself
            </Link>
          )}
          <GhostButton onClick={onReplay}>Replay the tour</GhostButton>
        </div>

        <ul className="mt-12 grid gap-3 md:grid-cols-3">
          {RECAP.map(([title, line]) => (
            <li
              key={title}
              className="rounded-2xl p-5"
              style={{ background: 'linear-gradient(168deg, var(--lp-raised), var(--lp-surface))', border: '1px solid var(--lp-line)' }}
            >
              <p className="text-[14px] font-semibold" style={{ color: 'var(--lp-fg)' }}>{title}</p>
              <p className="mt-1.5 text-[13px] leading-[1.6]" style={{ color: 'var(--lp-fg-dim)' }}>{line}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
