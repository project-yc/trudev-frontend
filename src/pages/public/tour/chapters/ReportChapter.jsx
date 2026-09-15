// Chapter 3 — what lands on the hiring manager's desk.
//
// The handoff band, shortlist and candidate hero are tour-specific, built to
// carry the same voice (Syne numerals, mono labels, ember signal dots) as the
// rest of the tour rather than falling back to a generic dashboard look. The
// coding and interview breakdowns below them are the REAL production report
// panels (CodingSectionPanel, AdaptiveSectionPanel), fed fixture data as-is —
// deliberately untouched here so the demo doesn't show a report the product
// can't actually produce. See the `trudev-outbound-tour` memory note: a
// matching redesign of those panels themselves is tracked as a separate,
// non-blocking follow-up.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { RecruiterThemeProvider } from '../../../../theme/RecruiterThemeProvider';
import { cn } from '../../../../lib/utils';
import { CodingSectionPanel } from '../../../recruiter/report-detail/components/panels/CodingSectionPanel';
import { AdaptiveSectionPanel } from '../../../recruiter/report-detail/components/panels/AdaptiveSectionPanel';
import { scoreBand, scoreTone } from '../../../recruiter/report-detail/utils/reportFormat';
import { SIGNAL_LABELS } from '../../../recruiter/report-detail/constants/sectionCards';
import { buildCandidates } from '../fixtures/reports';

const SECTION_ACCENTS = {
  coding: 'bg-[var(--color-section-coding)]',
  interview: 'bg-[var(--color-section-mcq)]',
};

// `dot` inline styles read the CSS vars directly rather than a Tailwind
// class — these render inside RecruiterThemeProvider, which only overrides
// the brand family, so success/warning stay the fixed semantic tokens.
const REVIEW = {
  clear: { label: 'Clear', dot: 'var(--color-success)' },
  requires_human_review: { label: 'Needs review', dot: 'var(--color-warning)' },
};

function Initials({ name }) {
  const initials = name.split(' ').map(part => part[0]).slice(0, 2).join('');
  return (
    <div className="flex h-[41px] w-[41px] shrink-0 items-center justify-center rounded-full border border-border-default bg-surface-muted text-[12px] font-bold text-text-secondary">
      {initials}
    </div>
  );
}

/**
 * Bridges the dark ember tour into the light recruiter report.
 *
 * The theme switch itself is the point — "now you're looking at this as the
 * hiring manager" — but cutting straight to a plain white panel read as the
 * tour running out of art direction, not as a deliberate reveal. A short,
 * quiet fade is enough to make it a beat instead of a wall.
 *
 * Two things kept this small on purpose, after an earlier pass overshot:
 *  - A caption used to sit inside the band, which meant the band needed real
 *    height to hold it legibly — that height read as a slab of solid black
 *    before it started fading. The "Hiring manager view" eyebrow right below
 *    already says this in words, so the band doesn't have to.
 *  - The gradient held its darkest color from 0% to 55% before fading — two
 *    stops that were nearly the same color, which is a flat black rectangle
 *    with a barely perceptible fade tacked onto the bottom of it. A plain
 *    two-stop gradient across the whole height reads as an actual fade.
 */
function HandoffBand() {
  return (
    <div
      aria-hidden="true"
      className="h-8 shrink-0 sm:h-9"
      style={{ background: 'linear-gradient(to bottom, #15110F 0%, #F8FAFC 100%)' }}
    />
  );
}

function Shortlist({ candidates, selectedId, onSelect }) {
  return (
    <div data-tour="report-shortlist" className="scroll-mt-4 overflow-hidden rounded-[14px] border border-border-default bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-muted">
              {['Candidate', 'Visible', 'Hidden', 'Coding', 'Interview', 'AI usage', 'Review'].map(label => (
                <th key={label} className="whitespace-nowrap px-3 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-text-muted first:px-4">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {candidates.map(candidate => {
              const selected = candidate.id === selectedId;
              const review = REVIEW[candidate.row.review];
              return (
                <tr
                  key={candidate.id}
                  onClick={() => onSelect(candidate.id)}
                  className={cn(
                    'cursor-pointer border-b border-border-subtle transition-colors last:border-0 hover:bg-surface-hover',
                    selected && 'bg-brand-tint-light hover:bg-brand-tint-light',
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', selected ? 'bg-brand' : 'bg-transparent')} />
                      <span className="font-semibold text-text-primary">{candidate.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 font-semibold text-success">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> {candidate.row.visible}
                    </span>
                  </td>
                  <td className={cn('px-3 py-3 font-display font-bold', candidate.row.hidden === '10/10' ? 'text-success' : 'text-warning')}>
                    {candidate.row.hidden}
                  </td>
                  <td className={cn('px-3 py-3 font-display font-bold', scoreTone(candidate.row.coding))}>{candidate.row.coding}</td>
                  <td className={cn('px-3 py-3 font-display font-bold', scoreTone(candidate.row.interview))}>{candidate.row.interview}</td>
                  <td className="px-3 py-3 text-text-secondary">{candidate.row.aiPattern}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-text-secondary">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: review.dot }} />
                      {review.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * The score is the one thing this page exists to say, so it gets the tour's
 * own display face at real size instead of sitting the same weight as every
 * other stat — everything else here (identity, review, section bars) reads
 * as support for that one number, not as five competing boxes.
 */
function CandidateHero({ candidate }) {
  const band = scoreBand(candidate.overall);
  const review = REVIEW[candidate.row.review];
  return (
    <div data-tour="report-hero" className="scroll-mt-4 overflow-hidden rounded-[14px] border border-border-default bg-surface shadow-card">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex min-w-0 items-center gap-4">
          <Initials name={candidate.name} />
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-semibold leading-[20px] text-text-primary">{candidate.name}</h2>
            <p className="mt-0.5 truncate text-[13px] text-text-muted">{candidate.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-6 sm:gap-8">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-[46px] font-bold leading-none tracking-[-0.03em] text-brand sm:text-[54px]">
              {Math.round(candidate.overall)}
            </span>
            <span className="text-[13px] font-semibold text-text-muted">/100</span>
          </div>
          <div className="flex flex-col gap-1.5 border-l border-border-subtle pl-6 sm:gap-2 sm:pl-8">
            <p className="whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-muted">
              {band ? SIGNAL_LABELS[band] : 'Overall signal'}
            </p>
            <div className="flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-text-secondary">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: review.dot }} />
              {review.label} · Full agent
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border-subtle px-6 py-5 sm:px-7">
        {candidate.sections.map(section => (
          <div key={section.key}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-muted">{section.label}</p>
              <p className="font-display text-[15px] font-bold leading-none text-text-primary">{section.percent}%</p>
            </div>
            <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-surface-muted">
              <div className={cn('h-full rounded-full', SECTION_ACCENTS[section.key])} style={{ width: `${section.percent}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-text-faint">
              {section.points} pts possible{section.key === 'coding' ? ` · ${candidate.row.hidden} hidden tests` : ''}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-border-subtle bg-surface-hover px-6 py-4 sm:px-7">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-muted">AI summary</p>
        <p className="mt-1.5 text-[14px] leading-[21px] text-text-secondary">{candidate.report.top_insight}</p>
      </div>
    </div>
  );
}

/**
 * There's a lot below the fold here — shortlist, hero, then two full report
 * panels — and the stage is its own scroll container inside the tour, not the
 * page itself, so nothing about the browser chrome hints that more is below.
 * A quiet, persistent nudge until the reader has actually scrolled some.
 */
function ScrollHint({ visible }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center transition-opacity duration-300 sm:inset-x-auto sm:right-6 sm:justify-end"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface px-3 py-1.5 text-[11.5px] font-medium text-text-secondary shadow-elevated">
        <ChevronDown className="h-3.5 w-3.5 animate-bounce" strokeWidth={2.2} />
        Scroll to see the full report
      </span>
    </div>
  );
}

function PanelCard({ tourId, title, subtitle, children }) {
  return (
    <section data-tour={tourId} className="scroll-mt-4 overflow-hidden rounded-[14px] border border-border-default bg-surface shadow-card">
      <header className="flex h-[56px] items-center border-b border-border-subtle px-[22px]">
        <div className="min-w-0">
          <h3 className="truncate font-display text-[16px] font-bold leading-[20px] text-text-primary">{title}</h3>
          {subtitle && <p className="truncate font-mono text-[11px] leading-[15px] text-text-muted">{subtitle}</p>}
        </div>
      </header>
      <div className="px-[22px] py-[20px]">{children}</div>
    </section>
  );
}

export default function ReportChapter({ view, stepKey, role }) {
  const candidates = useMemo(() => buildCandidates(role), [role]);
  // A row click overrides the script until the step changes.
  const [picked, setPicked] = useState({ stepKey: null, id: null });
  const selectedId = picked.stepKey === stepKey && picked.id ? picked.id : view.selected;
  const candidate = candidates.find(c => c.id === selectedId) || candidates[0];

  const scrollerRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const onScroll = () => setScrolled(el.scrollTop > 96);
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <RecruiterThemeProvider>
      <div className="relative h-full">
        <div ref={scrollerRef} className="h-full overflow-y-auto bg-page text-text-primary" style={{ colorScheme: 'light' }}>
          <HandoffBand />
          <div className="mx-auto flex max-w-[920px] flex-col gap-4 px-4 pb-6 pt-5 sm:px-6 sm:pt-6 lg:px-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">Hiring manager view</p>
              </div>
              <h1 className="mt-2 font-display text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-text-primary sm:text-[30px]">
                {role} <span className="font-normal text-text-muted">·</span> this week&apos;s candidates
              </h1>
              <p className="mt-2 max-w-[560px] text-[14px] leading-[20px] text-text-secondary">
                Evidence from each assessment — signal by section, not a verdict. Click a row to switch candidates.
              </p>
            </div>

            <Shortlist
              candidates={candidates}
              selectedId={candidate.id}
              onSelect={id => setPicked({ stepKey, id })}
            />

            <CandidateHero candidate={candidate} />

            <PanelCard tourId="report-coding" title="Coding task" subtitle="TDV-4412 · Alert engine misfiring">
              <CodingSectionPanel key={candidate.id} report={candidate.report} />
            </PanelCard>

            <PanelCard tourId="report-interview" title="Follow-up interview" subtitle="AI adaptive · coding task follow-up">
              <AdaptiveSectionPanel key={candidate.id} sectionReport={candidate.interview} />
            </PanelCard>
          </div>
        </div>
        <ScrollHint visible={!scrolled} />
      </div>
    </RecruiterThemeProvider>
  );
}
