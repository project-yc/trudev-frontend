// Chapter 2 — the follow-up interview, on the real candidate screen.
//
// InterviewChatScreen owns no state and does no I/O, so the scripted view
// drives it directly. The composer "types" each answer before it is sent.

import { useState } from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import InterviewChatScreen from '../../../candidate/adaptive-interview/components/InterviewChatScreen';
import ScenarioBody from '../../../candidate/adaptive-interview/components/ScenarioBody';
import { CandidateThemeScope } from '../../../../theme/CandidateThemeProvider';
import { INTERVIEW_QUESTION_TOTAL } from '../fixtures/interviewScript';
import { useCountdown, useTypewriter } from '../tourHooks';

const noop = () => {};

// Open, the drawer covers the (idle) composer plus the transcript's bottom
// padding and no more, so the question it belongs to stays readable right
// above it. Folded, it is a handle over the composer's keyboard hint.
const DRAWER_OPEN_PX = 236;
// Never so tall that the top bar and a line of transcript are lost (a phone on
// its side has ~340px of stage).
const DRAWER_KEEP_CLEAR_PX = 170;

/**
 * The scenario on a phone.
 *
 * On a laptop the log the question is about sits in a rail beside the chat.
 * Below 1024px the real screen folds that rail behind a top-bar icon, which is
 * right for a candidate who knows it is there and wrong for a tour: the step
 * says "here is a production log" and nothing on screen shows one. So the tour
 * puts it in a drawer at the foot of the chat that arrives OPEN on the step
 * that introduces it, and folds to a one-line handle after. At the foot, not
 * under the top bar: from the top it covered the very question it illustrates.
 */
function ScenarioDrawer({ scenario, open, onToggle }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-30 flex flex-col"
      style={{ height: open ? DRAWER_OPEN_PX : undefined, maxHeight: `calc(100% - ${DRAWER_KEEP_CLEAR_PX}px)` }}
    >
    <CandidateThemeScope className="flex min-h-0 flex-1 flex-col rounded-t-2xl border-t border-border-subtle bg-chrome shadow-[0_-10px_28px_-10px_rgba(0,0,0,0.6)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex h-10 shrink-0 items-center gap-2 px-4 text-left"
      >
        <FileText className="h-4 w-4 shrink-0 text-brand" strokeWidth={1.8} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text-primary">{scenario.title}</span>
        <span className="shrink-0 text-[12px] text-text-muted">{open ? 'Hide' : 'Show'}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ${open ? '' : 'rotate-180'}`} />
      </button>
      {open && (
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-border-subtle px-4 py-4">
          <ScenarioBody scenario={scenario} />
        </div>
      )}
    </CandidateThemeScope>
    </div>
  );
}

export default function InterviewChapter({ view, company, stepKey, compact = false }) {
  const typed = useTypewriter(view.composer);
  const remaining = useCountdown(14 * 60 + 30);

  // Below 1024px the scenario rail collapses into a top-bar button that opens
  // it as a sheet, so the button has to work here too. Scoped to the step: the
  // sheet covers Next, so it must not outlive the step it was opened on.
  const [sheetOpenFor, setSheetOpenFor] = useState(null);

  // The drawer is open on the step where the scenario first appears; a tap
  // flips it for the current step only.
  const [drawerFlippedFor, setDrawerFlippedFor] = useState(null);
  const arrivesOpen = stepKey === 'interview:2';
  const drawerOpen = arrivesOpen !== (drawerFlippedFor === stepKey);
  const flipDrawer = () => setDrawerFlippedFor(prev => (prev === stepKey ? null : stepKey));

  return (
    <div className="relative h-full">
      <InterviewChatScreen
        heightClassName="h-full"
        branding={{ candidate_name: company }}
        sectionName="Follow-up interview"
        sectionOrder={1}
        sectionCount={2}
        questionNumber={Math.max(view.question, 1)}
        questionTotal={INTERVIEW_QUESTION_TOTAL}
        remainingSeconds={remaining}
        scenario={view.scenario}
        scenarioSheetOpen={!compact && sheetOpenFor === stepKey}
        onScenarioSheetOpenChange={compact ? flipDrawer : open => setSheetOpenFor(open ? stepKey : null)}
        messages={view.messages}
        thinking={view.thinking}
        composerValue={typed}
        onComposerChange={noop}
        onSend={noop}
        composerDisabled={false}
        dictation={null}
      />
      {compact && view.scenario && (
        <ScenarioDrawer scenario={view.scenario} open={drawerOpen} onToggle={flipDrawer} />
      )}
    </div>
  );
}
