// Chapter 2 — the follow-up interview, on the real candidate screen.
//
// InterviewChatScreen owns no state and does no I/O, so the scripted view
// drives it directly. The composer "types" each answer before it is sent.

import InterviewChatScreen from '../../../candidate/adaptive-interview/components/InterviewChatScreen';
import { INTERVIEW_QUESTION_TOTAL } from '../fixtures/interviewScript';
import { useCountdown, useTypewriter } from '../tourHooks';

const noop = () => {};

export default function InterviewChapter({ view, company }) {
  const typed = useTypewriter(view.composer);
  const remaining = useCountdown(14 * 60 + 30);

  return (
    <div className="h-full">
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
        scenarioSheetOpen={false}
        onScenarioSheetOpenChange={noop}
        messages={view.messages}
        thinking={view.thinking}
        composerValue={typed}
        onComposerChange={noop}
        onSend={noop}
        composerDisabled={false}
        dictation={null}
      />
    </div>
  );
}
