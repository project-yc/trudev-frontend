import { AlertTriangle } from 'lucide-react';
import { useAssessmentBuilder } from '../../context/AssessmentBuilderContext';
import {
  ADAPTIVE_CARD_IMAGE,
  SECTION_CARDS,
  adaptiveSeniorityBlock,
  assessmentSeniorityOf,
} from './constants';
import { StepProgress } from './StepProgress';

// The card's only accessible name is its `<img alt>`, so the reason it is
// unavailable has to be described rather than baked into a label.
const ADAPTIVE_BLOCK_NOTICE_ID = 'adaptive-seniority-notice';

/**
 * The section-type picker.
 *
 * Save-as-draft and Review & Publish used to live at the bottom of this
 * component, which meant they vanished the moment you clicked a question —
 * selecting a question swaps the whole right panel to an editor. They are
 * builder-wide actions, so they now live in a persistent footer
 * (`BuilderActionsFooter`) instead.
 */
export function SectionSelectionContent({ currentStep, onAddSection }) {
  // Read live from the builder rather than through a prop: the seniority is set
  // on the details step, and the card has to re-gate when the recruiter changes
  // it there, not only on whatever it was at mount.
  const { state } = useAssessmentBuilder();
  const adaptiveBlock = adaptiveSeniorityBlock(assessmentSeniorityOf(state));

  return (
    <>
      <div className="w-[calc(100%-24px)]">
        <StepProgress currentStep={currentStep} />

        <div className="mt-[36px]">
          <h2 className="text-[22px] font-bold leading-[28px] text-text-primary">Assessment details</h2>
          <p className="mt-[4px] text-[14px] leading-[20px] text-text-secondary">
            This information is shown to candidates before they begin.
          </p>
        </div>

        {/* Left focusable and clickable when blocked rather than `disabled`:
            a disabled image-only button drops out of the tab order entirely, so
            the one control that carries the explanation would be unreachable by
            keyboard. `aria-disabled` announces the state, the notice below is
            its description, and the click is refused (with the same reason) by
            the drawer hook's seniority guard. */}
        {/* Three things made this read as an advertisement rather than the fifth
            section type, and all three are fixed here.

            1. ALIGNMENT. It stopped at 380px while the four real cards below
               spanned the panel, so it floated over a grid it did not belong to.
               It is now full width, flush with them.
            2. NO LABEL. Every card in the grid has a caption underneath naming
               the section it adds ("MCQ section", "Coding section"). This one
               had none — nothing outside the artwork said it was a section type
               at all. It now has the same caption, in the same place, in the
               same type.
            3. NO STATES. It is the only choice rendered as a flat <img>; the
               others are bordered cards whose border darkens on hover. Artwork
               cannot carry a hover state, so the states live on the wrapper: the
               border picks up the CTA colour, the card lifts, the shadow
               deepens. Same gesture as the grid, just larger. */}
        <div className="mt-[24px] w-full">
          <button
            type="button"
            onClick={() => onAddSection('adaptive', 'AI Adaptive Interview')}
            aria-disabled={adaptiveBlock ? true : undefined}
            aria-describedby={adaptiveBlock ? ADAPTIVE_BLOCK_NOTICE_ID : undefined}
            className={`group block w-full rounded-[12px] border bg-surface p-[4px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-assessment-cta)] focus-visible:ring-offset-2 ${
              adaptiveBlock
                ? 'cursor-not-allowed border-border-default opacity-50 grayscale'
                : 'cursor-pointer border-border-default transition-all duration-200 hover:-translate-y-[2px] hover:border-[var(--color-assessment-cta)] hover:shadow-modal'
            }`}
          >
            <img
              src={ADAPTIVE_CARD_IMAGE}
              alt=""
              // The artwork is a 3.7MB SVG. Without a reserved box the card
              // collapses to its caption until it decodes, and the four cards
              // below jump ~200px up and then back down. 650x192 is the SVG's
              // own viewBox.
              className="block aspect-[650/192] w-full select-none rounded-[9px] bg-surface-muted"
              draggable={false}
            />
            {/* The card's accessible name now comes from this caption rather
                than the artwork's `alt`, which is why the image is decorative
                above — otherwise the button announced its subject twice. */}
            <span className="flex items-center justify-center gap-[8px] pb-[9px] pt-[10px] text-[13px] font-semibold leading-none text-text-primary">
              AI Adaptive Interview section
              <span className="rounded-full bg-[var(--color-assessment-cta)] px-[7px] py-[3px] text-[10px] font-bold uppercase tracking-wide text-[var(--color-assessment-cta-text)]">
                New
              </span>
            </span>
          </button>

          {adaptiveBlock && (
            <div
              id={ADAPTIVE_BLOCK_NOTICE_ID}
              className="mt-[10px] rounded-[10px] border border-warning-border bg-warning-bg px-[12px] py-[11px]"
            >
              <div className="flex items-center gap-[8px]">
                <AlertTriangle className="h-[16px] w-[16px] flex-shrink-0 text-warning" strokeWidth={2} />
                <p className="text-[13px] font-bold text-warning">{adaptiveBlock.title}</p>
              </div>
              <p className="mt-[6px] text-[12px] leading-[17px] text-text-secondary">
                {adaptiveBlock.detail}
              </p>
            </div>
          )}
        </div>

        <div className="mt-[18px] grid grid-cols-2 gap-[12px] xl:grid-cols-4">
          {SECTION_CARDS.map(({ type, label, icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => onAddSection(type, label)}
              className="group flex h-[98px] flex-col items-center justify-between rounded-[10px] border border-border-default bg-surface p-[4px] text-center transition-colors hover:border-border-strong hover:bg-surface-hover"
            >
              <div className="flex h-[62px] w-full items-center justify-center rounded-[8px] bg-surface-muted">
                <img src={icon} alt="" className="h-[40px] w-[43px] select-none" draggable={false} />
              </div>
              <span className="pb-[9px] text-[13px] font-semibold leading-none text-text-primary">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
