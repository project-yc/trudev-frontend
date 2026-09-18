// Chapter 4 — every other format, each one tryable.
//
// Question formats render the real candidate QuestionStage on the candidate
// theme; interview modes play the scripted transcripts from the public
// adaptive-interview page. Whether roadmap modes carry a "Coming soon" label
// is decided by ROADMAP_AS_LIVE in tourConfig.js.

import { useState } from 'react';
import { Check } from 'lucide-react';
import QuestionStage from '../../../../components/candidate/exam/QuestionStage';
import { CandidateThemeScope } from '../../../../theme/CandidateThemeProvider';
import { USE_CASES } from '../../adaptive-interview/useCases';
import ChatMock from '../../adaptive-interview/components/ChatMock';
import { DISPLAY, MONO } from '../../adaptive-interview/components/primitives';
import { SAMPLE_FREE_TEXT, SAMPLE_MCQ_MULTI, SAMPLE_MCQ_SINGLE, SAMPLE_RANKING } from '../fixtures/formats';
import { ROADMAP_AS_LIVE } from '../tourConfig';

const QUESTION_TABS = [
  { id: 'mcq', label: 'Multiple choice', blurb: 'Single answer, auto-graded', contentType: 'mcq', question: SAMPLE_MCQ_SINGLE },
  { id: 'multi', label: 'Multi-select', blurb: 'Several right answers', contentType: 'mcq', question: SAMPLE_MCQ_MULTI },
  { id: 'ranking', label: 'Ranking', blurb: 'Order by priority, partial credit', contentType: 'ranking', question: SAMPLE_RANKING },
  { id: 'free_text', label: 'Written answer', blurb: 'Scored, with strengths and gaps quoted', contentType: 'free_text', question: SAMPLE_FREE_TEXT[0] },
];

const MODE_TABS = USE_CASES.map(useCase => ({
  id: useCase.id,
  label: useCase.tab,
  accent: useCase.accent,
  soon: !ROADMAP_AS_LIVE && useCase.status === 'soon',
  useCase,
}));

const EXTRAS = [
  'Coding tasks in real repos, with the AI level you choose',
  'Ashby integration: invites, status and scores sync back',
  'Mix any of these into one assessment',
];

function ListButton({ active, onClick, children, accent }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[rgba(255,240,230,0.05)]"
      style={{
        background: active ? 'rgba(255,133,40,0.1)' : undefined,
        border: `1px solid ${active ? 'rgba(255,133,40,0.35)' : 'transparent'}`,
      }}
    >
      <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full" style={{ background: accent || 'var(--lp-ember-bright)', opacity: active ? 1 : 0.5 }} />
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

/** Phone version of ListButton: one chip in a sideways-scrolling row. */
function Chip({ active, onClick, children, accent }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold"
      style={{
        color: active ? 'var(--lp-fg)' : 'var(--lp-fg-dim)',
        background: active ? 'rgba(255,133,40,0.12)' : 'rgba(255,240,230,0.03)',
        border: `1px solid ${active ? 'rgba(255,133,40,0.4)' : 'var(--lp-line)'}`,
      }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent || 'var(--lp-ember-bright)', opacity: active ? 1 : 0.55 }} />
      {children}
    </button>
  );
}

function Extras() {
  return (
    <ul className="flex flex-col gap-2">
      {EXTRAS.map(extra => (
        <li key={extra} className="flex items-start gap-2 text-[12.5px] leading-[1.5]" style={{ color: 'var(--lp-fg-dim)' }}>
          <Check className="mt-[3px] h-3.5 w-3.5 shrink-0" style={{ color: 'var(--lp-ember-bright)' }} />
          {extra}
        </li>
      ))}
    </ul>
  );
}

function GroupLabel({ children }) {
  return (
    <p className="px-3 pb-1.5 pt-4 text-[10.5px] uppercase first:pt-0" style={{ fontFamily: MONO, letterSpacing: '0.14em', color: 'var(--lp-fg-faint)' }}>
      {children}
    </p>
  );
}

// The candidate screen sets its type for a full page (19px questions, roomy
// option cards). Inside the phone tour's ~400px stage that read as blown up and
// showed half a question, so it is drawn at 80% there. `zoom`, not a transform:
// it reflows, so the card still fills the width and takes less height.
const COMPACT_ZOOM = 0.8;

function QuestionPreview({ tab, answer, onAnswer, compact = false }) {
  return (
    <div>
      <p className={compact ? 'text-[11px]' : 'text-[12px]'} style={{ fontFamily: MONO, color: 'var(--lp-fg-faint)' }}>
        The candidate screen, exactly as it ships. Go ahead and answer.
      </p>
      <CandidateThemeScope className={`overflow-hidden rounded-2xl border border-border-subtle ${compact ? 'mt-2' : 'mt-3'}`}>
        <div className={compact ? 'bg-page px-5 py-5' : 'bg-page px-4 py-5 sm:px-8 sm:py-8'} style={compact ? { zoom: COMPACT_ZOOM } : undefined}>
          <QuestionStage
            question={tab.question}
            index={0}
            contentType={tab.contentType}
            answer={answer ?? (tab.contentType === 'free_text' ? '' : [])}
            onAnswerChange={onAnswer}
          />
        </div>
      </CandidateThemeScope>
    </div>
  );
}

function ModePreview({ tab }) {
  const { useCase } = tab;
  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="text-[10.5px] uppercase" style={{ fontFamily: MONO, letterSpacing: '0.16em', color: tab.accent }}>
            AI interview mode
          </span>
          {tab.soon && (
            <span
              className="rounded-full px-2 py-[2px] text-[10px] uppercase"
              style={{ fontFamily: MONO, letterSpacing: '0.08em', color: 'var(--lp-fg-faint)', border: '1px solid var(--lp-line)' }}
            >
              Coming soon
            </span>
          )}
        </div>
        <h3
          className="mt-3 text-[clamp(1.3rem,2vw,1.7rem)] leading-[1.18]"
          style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--lp-fg)' }}
        >
          {useCase.title}
        </h3>
        <p className="mt-3 text-[14px] leading-[1.7]" style={{ color: 'var(--lp-fg-dim)' }}>{useCase.body}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {useCase.proof.map(point => (
            <li key={point} className="flex items-start gap-2.5 text-[13px] leading-[1.55]" style={{ color: 'var(--lp-fg-dim)' }}>
              <Check className="mt-[3px] h-3.5 w-3.5 shrink-0" style={{ color: tab.accent }} />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div className="min-w-0">
        <ChatMock key={tab.id} chat={useCase.chat} accent={tab.accent} />
        <p className="mt-2 text-center text-[10.5px]" style={{ fontFamily: MONO, color: 'var(--lp-fg-faint)' }}>
          Illustrative transcript
        </p>
      </div>
    </div>
  );
}

export default function FormatsChapter({ view, stepKey, compact = false }) {
  // A click overrides the script until the step changes.
  const [picked, setPicked] = useState({ stepKey: null, id: null });
  const [answers, setAnswers] = useState({});
  const activeId = picked.stepKey === stepKey && picked.id ? picked.id : view.tab;
  const questionTab = QUESTION_TABS.find(tab => tab.id === activeId);
  const modeTab = MODE_TABS.find(tab => tab.id === activeId);
  const pick = id => setPicked({ stepKey, id });

  const preview = (
    <>
      {questionTab && (
        <QuestionPreview
          compact={compact}
          tab={questionTab}
          answer={answers[questionTab.id]}
          onAnswer={value => setAnswers(prev => ({ ...prev, [questionTab.id]: value }))}
        />
      )}
      {modeTab && <ModePreview tab={modeTab} />}
    </>
  );

  // Phones: the 12-row list would fill the whole stage and push the preview
  // (the actual point) off screen, so it becomes two rows of chips pinned above
  // one scrolling preview.
  if (compact) {
    return (
      <div className="flex h-full flex-col" style={{ background: 'var(--lp-ink)' }}>
        <nav
          data-tour="formats-list"
          aria-label="Formats"
          className="relative shrink-0 border-b py-2"
          style={{ borderColor: 'var(--lp-line)' }}
        >
          {/* The rows scroll sideways; the fade says so. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10"
            style={{ background: 'linear-gradient(to right, transparent, var(--lp-ink))' }}
          />
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 pl-3 pr-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUESTION_TABS.map(tab => (
              <Chip key={tab.id} active={tab.id === activeId} onClick={() => pick(tab.id)}>{tab.label}</Chip>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pl-3 pr-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MODE_TABS.map(tab => (
              <Chip key={tab.id} active={tab.id === activeId} onClick={() => pick(tab.id)} accent={tab.accent}>
                {tab.label}{tab.soon ? ' · soon' : ''}
              </Chip>
            ))}
          </div>
        </nav>
        <div data-tour="formats-preview" className="min-h-0 flex-1 overflow-y-auto p-3">
          {preview}
          <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--lp-line)' }}>
            <p className="pb-2 text-[10.5px] uppercase" style={{ fontFamily: MONO, letterSpacing: '0.14em', color: 'var(--lp-fg-faint)' }}>
              Also included
            </p>
            <Extras />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col md:flex-row" style={{ background: 'var(--lp-ink)' }}>
      <nav
        data-tour="formats-list"
        aria-label="Formats"
        className="shrink-0 overflow-y-auto border-b p-3 md:w-[280px] md:border-b-0 md:border-r md:p-4"
        style={{ borderColor: 'var(--lp-line)' }}
      >
        <GroupLabel>Question formats</GroupLabel>
        {QUESTION_TABS.map(tab => (
          <ListButton key={tab.id} active={tab.id === activeId} onClick={() => pick(tab.id)}>
            <span className="block text-[13.5px] font-semibold" style={{ color: 'var(--lp-fg)' }}>{tab.label}</span>
            <span className="block text-[12px]" style={{ color: 'var(--lp-fg-faint)' }}>{tab.blurb}</span>
          </ListButton>
        ))}

        <GroupLabel>AI interview modes</GroupLabel>
        {MODE_TABS.map(tab => (
          <ListButton key={tab.id} active={tab.id === activeId} onClick={() => pick(tab.id)} accent={tab.accent}>
            <span className="flex items-center gap-2 text-[13.5px] font-semibold" style={{ color: 'var(--lp-fg)' }}>
              {tab.label}
              {tab.soon && (
                <span className="rounded-full px-1.5 py-px text-[9px] uppercase" style={{ fontFamily: MONO, color: 'var(--lp-fg-faint)', border: '1px solid var(--lp-line)' }}>
                  soon
                </span>
              )}
            </span>
          </ListButton>
        ))}

        <GroupLabel>Also included</GroupLabel>
        <div className="px-3 pb-2"><Extras /></div>
      </nav>

      <div data-tour="formats-preview" className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5 lg:p-8">
        {preview}
      </div>
    </div>
  );
}
