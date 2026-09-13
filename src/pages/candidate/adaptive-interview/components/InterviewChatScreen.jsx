// ─────────────────────────────────────────────────────────────────────────────
// InterviewChatScreen — the chat screen's presentation, split out of
// index.jsx.
//
// It owns no state and performs no I/O. Everything comes in as props, which is
// what let a local-state design preview drive this exact component while the
// screen was being built — that harness has since been removed, but the split
// is kept because it separates layout from the session/polling logic in
// index.jsx.
// ─────────────────────────────────────────────────────────────────────────────

import ExamShell from '../../../../components/candidate/exam/ExamShell'
import AdaptiveInterviewTopBar from './AdaptiveInterviewTopBar'
import InterviewAmbient from './InterviewAmbient'
import ChatMessageList from './ChatMessageList'
import Composer from './Composer'
import ScenarioPanel from './ScenarioPanel'
import ScenarioPanelSheet from './ScenarioPanelSheet'

export default function InterviewChatScreen({
  branding,
  sectionName,
  sectionOrder,
  sectionCount,
  questionNumber,
  questionTotal,
  remainingSeconds,
  elapsedSeconds,

  scenario,
  scenarioSheetOpen,
  onScenarioSheetOpenChange,

  messages,
  thinking,
  thinkingLabel,
  pendingMessageId,

  composerRef,
  composerValue,
  onComposerChange,
  onSend,
  composerDisabled,
  dictation,
  sendError,

  // Rendered in the composer's place once the interview is over, so the
  // transcript, the scenario rail and the ambient ground all stay exactly as
  // they were while the candidate reads the interviewer's last line. Swapping to
  // a different-looking screen at that moment reads as the interview being cut
  // off, which is the thing being fixed — hence an override here rather than a
  // second screen component.
  closing = null,
  // Top-bar "End interview". Absent on screens that are already closing.
  onEndInterview = null,
}) {
  return (
    <ExamShell
      branding={branding}
      topBar={(
        <AdaptiveInterviewTopBar
          branding={branding}
          sectionName={sectionName}
          sectionOrder={sectionOrder}
          sectionCount={sectionCount}
          questionNumber={questionNumber}
          questionTotal={questionTotal}
          remainingSeconds={remainingSeconds}
          elapsedSeconds={elapsedSeconds}
          onOpenScenario={scenario ? () => onScenarioSheetOpenChange?.(true) : null}
          onEndInterview={closing ? null : onEndInterview}
        />
      )}
      // Right-hand rail: the conversation is the task, the scenario is the
      // reference material for it. See ScenarioPanel.
      sidebar={scenario ? <ScenarioPanel scenario={scenario} /> : null}
      sidebarPosition="right"
      ambient={<InterviewAmbient />}
      // Bottom padding clears the veil below. The veil blurs the last 56px of
      // the scroll area so the transcript dissolves as it passes behind the
      // composer — without this the final message comes to REST inside that
      // band and sits there permanently out of focus.
      contentClassName="max-w-[760px] pb-20 lg:pb-20"
      footer={(
        // Pinned: the composer is the one control on this screen, and inside
        // the scroller it slid off the bottom as the transcript grew — on a
        // long answer the candidate was typing into a box they could not see.
        <div className="relative z-20 shrink-0">
          {/* Blur the transcript out as it passes behind the composer rather
              than fading it to a colour: a solid fade would paint a flat band
              across the ember ground. */}
          <div
            aria-hidden="true"
            className="interview-composer-veil pointer-events-none absolute inset-x-0 bottom-0 top-[-56px] backdrop-blur-[10px]"
          />
          <div className="relative mx-auto w-full max-w-[760px] px-5 pb-5 pt-3 lg:px-6">
            {sendError && !closing && (
              <p role="alert" className="mb-2 text-[13px] leading-[1.5] text-error">
                {sendError}
              </p>
            )}

            {closing || (
              <Composer
                inputRef={composerRef}
                value={composerValue}
                onChange={onComposerChange}
                onSend={onSend}
                disabled={composerDisabled}
                dictation={dictation}
              />
            )}
          </div>
        </div>
      )}
    >
      {/* No candidate name is passed: `branding.candidate_name` is the ORG's
          candidate-facing display name (ExamBrand renders it as the brand), not
          the person answering — using it as an initial would put the company's
          letter on the candidate's own bubbles. The AI avatar is not
          branding-driven either — see ChatAvatar. */}
      <ChatMessageList
        messages={messages}
        thinking={thinking}
        thinkingLabel={thinkingLabel}
        pendingMessageId={pendingMessageId}
      />

      <ScenarioPanelSheet
        open={Boolean(scenarioSheetOpen && scenario)}
        onOpenChange={onScenarioSheetOpenChange}
        scenario={scenario}
      />
    </ExamShell>
  )
}
