// Chapter 3 — what lands on the hiring manager's desk.
//
// The shortlist and the candidate header are tour-specific, laid out like the
// recruiter report page. The coding and interview breakdowns below them are
// the production report panels, fed fixture data.

import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { RecruiterThemeProvider } from '../../../../theme/RecruiterThemeProvider';
import { Badge } from '../../../../components/ui/badge';
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

const REVIEW = {
  clear: { label: 'Clear', variant: 'success' },
  requires_human_review: { label: 'Needs review', variant: 'warning' },
};

function Initials({ name }) {
  const initials = name.split(' ').map(part => part[0]).slice(0, 2).join('');
  return (
    <div className="flex h-[41px] w-[41px] shrink-0 items-center justify-center rounded-full border border-border-default bg-surface-muted text-[12px] font-bold text-text-secondary">
      {initials}
    </div>
  );
}

function Shortlist({ candidates, selectedId, onSelect }) {
  return (
    <div data-tour="report-shortlist" className="scroll-mt-4 overflow-hidden rounded-[10px] border border-border-default bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-muted text-[11.5px] uppercase tracking-[0.04em] text-text-muted">
              <th className="px-4 py-2.5 font-semibold">Candidate</th>
              <th className="px-3 py-2.5 font-semibold">Visible tests</th>
              <th className="px-3 py-2.5 font-semibold">Hidden tests</th>
              <th className="px-3 py-2.5 font-semibold">Coding</th>
              <th className="px-3 py-2.5 font-semibold">Interview</th>
              <th className="px-3 py-2.5 font-semibold">AI usage</th>
              <th className="px-3 py-2.5 font-semibold">Review</th>
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
                      <span className={cn('h-2 w-2 rounded-full', selected ? 'bg-brand' : 'bg-transparent')} />
                      <span className="font-semibold text-text-primary">{candidate.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 font-semibold text-success">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> {candidate.row.visible}
                    </span>
                  </td>
                  <td className={cn('px-3 py-3 font-semibold', candidate.row.hidden === '10/10' ? 'text-success' : 'text-warning')}>
                    {candidate.row.hidden}
                  </td>
                  <td className={cn('px-3 py-3 font-bold', scoreTone(candidate.row.coding))}>{candidate.row.coding}</td>
                  <td className={cn('px-3 py-3 font-bold', scoreTone(candidate.row.interview))}>{candidate.row.interview}</td>
                  <td className="px-3 py-3 text-text-secondary">{candidate.row.aiPattern}</td>
                  <td className="px-3 py-3"><Badge variant={review.variant}>{review.label}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CandidateHero({ candidate }) {
  const band = scoreBand(candidate.overall);
  const review = REVIEW[candidate.row.review];
  return (
    <div data-tour="report-hero" className="scroll-mt-4 rounded-[10px] border border-border-default bg-surface px-6 pb-5 pt-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Initials name={candidate.name} />
          <div className="min-w-0">
            <h2 className="truncate text-[18px] font-bold leading-[22px] text-text-primary">{candidate.name}</h2>
            <p className="mt-[3px] truncate text-[13px] text-[var(--color-report-email-text)]">{candidate.email}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[20px] font-bold leading-none text-[var(--color-assessment-accent)]">
            {candidate.overall.toFixed(1)} <span className="text-[14px] font-semibold text-text-primary">(out of 100)</span>
          </p>
          <p className="mt-1 text-[12px] text-text-secondary">Overall signal{band ? ` · ${SIGNAL_LABELS[band]}` : ''}</p>
          <div className="mt-2 flex flex-wrap justify-end gap-1.5">
            <Badge variant="secondary">AI: Full agent</Badge>
            <Badge variant={review.variant}>Review: {review.label}</Badge>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-6 border-t border-dashed border-border-default pt-4">
        {candidate.sections.map(section => (
          <div key={section.key} className="min-w-[180px] flex-1">
            <p className="truncate text-[12px] font-medium uppercase leading-none text-[var(--color-report-email-text)]">
              {section.label}
            </p>
            <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-surface-muted">
              <div className={cn('h-full rounded-full', SECTION_ACCENTS[section.key])} style={{ width: `${section.percent}%` }} />
            </div>
            <p className="mt-3 text-[13px] font-bold text-text-primary">
              {section.percent}% of {section.points} pts
            </p>
            {section.key === 'coding' && (
              <p className="mt-1 text-[11px] font-medium text-text-secondary">
                {candidate.row.hidden} hidden tests passed
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[10px] border border-border-subtle bg-surface-hover px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase leading-[14px] tracking-wide text-text-muted">AI summary</p>
        <p className="mt-1 text-[14px] leading-[20px] text-text-secondary">{candidate.report.top_insight}</p>
      </div>
    </div>
  );
}

function PanelCard({ tourId, title, subtitle, children }) {
  return (
    <section data-tour={tourId} className="scroll-mt-4 rounded-[10px] border border-border-default bg-surface shadow-card">
      <header className="flex h-[56px] items-center border-b border-border-subtle px-[22px]">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-bold leading-[20px] text-text-primary">{title}</h3>
          {subtitle && <p className="truncate text-[12px] leading-[15px] text-text-muted">{subtitle}</p>}
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

  return (
    <RecruiterThemeProvider>
      <div className="h-full overflow-y-auto bg-page text-text-primary" style={{ colorScheme: 'light' }}>
        <div className="mx-auto flex max-w-[920px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-text-muted">Hiring manager view</p>
            <h1 className="mt-1 text-[22px] font-bold leading-[27px] text-text-primary">{role} · this week&apos;s candidates</h1>
            <p className="mt-1 text-[14px] leading-[20px] text-text-secondary">
              Evidence from each assessment: signal by section, not a verdict. Click a row to switch candidates.
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
    </RecruiterThemeProvider>
  );
}
