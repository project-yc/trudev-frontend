import { MONO } from '../../adaptive-interview/components/primitives';
import { INTERVIEW_GROUNDING } from '../fixtures/interviewScript';

/** What the interviewer had loaded before asking its first question. */
export default function GroundingPanel() {
  return (
    <div>
      <p className="text-[12px] font-semibold" style={{ color: 'var(--lp-fg)' }}>What the interviewer read first</p>
      <p className="mt-1 text-[11.5px] leading-[1.5]" style={{ color: 'var(--lp-fg-faint)' }}>
        Questions are generated from this candidate&apos;s session, not from a question bank.
      </p>
      <dl className="mt-3 flex flex-col gap-1.5">
        {INTERVIEW_GROUNDING.map(item => (
          <div
            key={item.label}
            className="rounded-lg px-2.5 py-2"
            style={{ background: 'rgba(255,240,230,0.03)', border: '1px solid var(--lp-line-soft)' }}
          >
            <dt className="text-[10.5px] uppercase" style={{ fontFamily: MONO, letterSpacing: '0.08em', color: 'var(--lp-fg-faint)' }}>
              {item.label}
            </dt>
            <dd className="mt-0.5 text-[12px]" style={{ color: 'var(--lp-fg-dim)' }}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
