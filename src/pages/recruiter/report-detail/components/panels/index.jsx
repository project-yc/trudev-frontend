import { CodingSectionPanel } from './CodingSectionPanel';
import { McqSectionPanel } from './McqSectionPanel';
import { AdaptiveSectionPanel } from './AdaptiveSectionPanel';
import { FreeTextSectionPanel } from './FreeTextSectionPanel';
import { RankingSectionPanel } from './RankingSectionPanel';
import { PanelBlock } from '../SectionPanel';
import { CODING_CONTENT_TYPES } from '../../constants/sectionPanels';

/**
 * Placeholder for section types whose panels are designed but not yet built.
 * Shows the scored facts we do have rather than an empty drawer.
 */
function PendingPanel({ section }) {
  const score = Number(section?.score);
  const maxScore = Number(section?.max_score);
  const serverPct = Number(section?.section_percentage);
  // Prefer the server's normalized section percentage; fall back to raw points.
  const percent = Number.isFinite(serverPct)
    ? Math.round(serverPct)
    : (Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
        ? Math.round((score / maxScore) * 100)
        : null);
  const hasScore = percent !== null;

  return (
    <PanelBlock>
      {hasScore && (
        <div className="rounded-[10px] border border-border-subtle bg-surface-hover px-[14px] py-[12px]">
          <p className="text-[12px] uppercase tracking-[0.08em] text-text-muted">Section score</p>
          <p className="mt-[6px] text-[26px] font-bold leading-none text-text-primary">
            {percent}
            <span className="text-[15px] font-semibold text-text-muted">/100</span>
          </p>
          {Number.isFinite(maxScore) && maxScore > 0 && (
            <p className="mt-[4px] text-[12px] text-text-muted">{score} of {maxScore} points</p>
          )}
        </div>
      )}
      <p className="mt-[14px] text-[13px] leading-[19px] text-text-secondary">
        The detailed breakdown for this section type is not built yet.
      </p>
    </PanelBlock>
  );
}

export function SectionPanelContent({ section, report }) {
  if (CODING_CONTENT_TYPES.includes(section?.content_type)) {
    return <CodingSectionPanel report={report} />;
  }
  if (section?.content_type === 'mcq') {
    return <McqSectionPanel section={section} report={report} />;
  }
  if (section?.content_type === 'adaptive_interview') {
    return <AdaptiveSectionPanel section={section} report={report} />;
  }
  if (section?.content_type === 'free_text') {
    return <FreeTextSectionPanel section={section} report={report} />;
  }
  if (section?.content_type === 'ranking') {
    return <RankingSectionPanel section={section} report={report} />;
  }
  return <PendingPanel section={section} />;
}
