// ─────────────────────────────────────────────────────────────────────────────
// Candidate flow preview — DEV ONLY (`/__exam-preview`).
//
// Every screen a candidate can see between clicking an invite link and closing
// the tab, mounted against fixtures so the whole flow can be reviewed without a
// backend, an invite token, or a 90-minute run.
//
// These are the REAL components and, where the screen is a page, the real page
// — not copies. `installMocks()` patches `window.fetch` for the handful of
// candidate endpoints the pages call, and each screen mounts inside a
// MemoryRouter so `useParams` resolves. That means a regression on this page is
// a regression in the product; a mock-up would have let the two drift.
//
// Gated on `import.meta.env.DEV` in App.jsx AND lazily imported there, so
// neither this module nor its fixtures reach a production bundle.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CANDIDATE_ROUTES } from '../../routes/candidateRoutes'
import AssessmentLandingPage from './AssessmentLandingPage'
import AssessmentTermsPage from './AssessmentTermsPage'
import PublicDemoPage from './PublicDemoPage'
import CandidateMcqSectionExperience from '../../components/candidate/CandidateMcqSectionExperience'
import CandidateExperienceFeedbackScreen from '../../components/candidate/CandidateExperienceFeedbackScreen'
import { CandidateBootScreen } from '../../components/candidate/CandidateBootScreen'
import InterviewChatScreen from './adaptive-interview/components/InterviewChatScreen'
import InterviewStatusPanel from './adaptive-interview/components/InterviewStatusPanel'
import AdaptiveInterviewTopBar from './adaptive-interview/components/AdaptiveInterviewTopBar'
import ExamButton from '../../components/candidate/exam/ExamButton'
import {
  CandidateCenteredErrorState,
  CandidateCenteredLoadingState,
  CandidateCompletionScreen,
  CandidateSectionIntroScreen,
} from '../../components/candidate/CandidateSectionScaffold'
import ExamShell, { ExamTopBar } from '../../components/candidate/exam/ExamShell'
import { ConnectionStatus, ExamBrand } from '../../components/candidate/exam/ExamStatus'
import { SectionStepperCompact } from '../../components/candidate/exam/SectionStepper'
import { saveCandidateBranding } from '../../theme/CandidateThemeProvider'
import {
  SAMPLE_FREE_TEXT,
  SAMPLE_MCQ_MULTI,
  SAMPLE_MCQ_SINGLE,
  SAMPLE_RANKING,
} from '../public/tour/fixtures/formats'
import {
  A1_FULL,
  A1_THIN,
  A2,
  INTERVIEW_QUESTION_TOTAL,
  NUDGE_1,
  Q1,
  Q2,
  Q2_SCENARIO,
  Q3,
} from '../public/tour/fixtures/interviewScript'

// ── Fixtures ────────────────────────────────────────────────────────────────

const BRANDING = { candidate_name: 'Northwind', logo_url: '', tagline: 'Engineering' }

const SECTIONS = [
  { id: 's1', name: 'Fix the double-charge bug', content_type: 'technical_task', timer_minutes: 45 },
  { id: 's2', name: 'Follow-up interview about your code', content_type: 'adaptive_interview', timer_minutes: 15 },
  { id: 's3', name: 'System design judgement', content_type: 'mcq', timer_minutes: 20 },
  { id: 's4', name: 'Incident write-up', content_type: 'free_text', timer_minutes: 15 },
]

const OVERVIEW = {
  assessment_name: 'Senior Backend Engineer — Payments',
  candidate_name: 'Priya',
  total_duration_minutes: 95,
  ai_level: 'assisted',
  instance_status: 'INVITED',
  org_branding: BRANDING,
  sections: SECTIONS,
}

const DEMO = {
  assessment_name: 'Backend Engineer — live demo',
  description: 'A real bug in a real repository, an AI interview about the code you just wrote, then the report your hiring team would get.',
  org_name: 'TruDev',
}


// Padded out so the navigator has something to navigate.
const MCQ_ITEMS = [
  SAMPLE_MCQ_SINGLE,
  SAMPLE_MCQ_MULTI,
  ...Array.from({ length: 10 }, (_, i) => ({
    item_attempt_id: `a${i + 3}`,
    points: 1,
    question: {
      prompt: `Placeholder question ${i + 3} — what does the event loop do between macrotasks?`,
      selection_mode: 'single',
      options: [
        { id: 1, text: 'Drains the microtask queue' },
        { id: 2, text: 'Blocks until the next timer' },
        { id: 3, text: 'Runs garbage collection' },
      ],
    },
  })),
]

const FREE_TEXT_ITEMS = [
  ...SAMPLE_FREE_TEXT,
  {
    item_attempt_id: 'f3',
    points: 3,
    question: {
      prompt: 'What is the smallest change that would have prevented the double charge entirely?',
      word_limit: 150,
    },
  },
]

const RANKING_ITEMS = [
  SAMPLE_RANKING,
  {
    item_attempt_id: 'r2',
    points: 3,
    question: {
      prompt: 'Rank these by how much they would reduce checkout latency, most first.',
      options: [
        { id: 1, text: 'Cache the pricing lookup' },
        { id: 2, text: 'Move the audit write off the request path' },
        { id: 3, text: 'Add a second application server' },
        { id: 4, text: 'Batch the two downstream calls' },
      ],
    },
  },
]

// Some answers pre-filled, so the navigator, the review list and the "answered"
// treatments are all visible without clicking through first.
const SEEDED_ANSWERS = {
  mcq: { a1: ['2'], a3: ['1'], a4: ['1'], a5: ['2'] },
  free_text: { f2: 'We shipped a migration that locked the orders table for four minutes during peak.' },
  ranking: { r1: ['1', '5', '2', '3', '4'] },
}

const ITEMS_BY_TYPE = { mcq: MCQ_ITEMS, free_text: FREE_TEXT_ITEMS, ranking: RANKING_ITEMS }

// The adaptive interview reuses the tour's script, so the gallery and the
// public tour show the same conversation — one fixture to keep honest instead
// of two that drift. `isNudge` marks the engine's single follow-up on Q1, which
// has its own bubble treatment.
const INTERVIEW_MESSAGES = [
  { id: 'm1', role: 'ai', text: Q1 },
  { id: 'm2', role: 'candidate', text: A1_THIN },
  { id: 'm3', role: 'ai', text: NUDGE_1, isNudge: true },
  { id: 'm4', role: 'candidate', text: A1_FULL },
  { id: 'm5', role: 'ai', text: Q2 },
]

const INTERVIEW_MESSAGES_ANSWERED = [
  ...INTERVIEW_MESSAGES,
  { id: 'm6', role: 'candidate', text: A2 },
]

const INTERVIEW_FAREWELL_MESSAGES = [
  ...INTERVIEW_MESSAGES_ANSWERED,
  { id: 'm7', role: 'ai', text: Q3 },
  {
    id: 'm8',
    role: 'candidate',
    text: 'If bad ticks stopped being rare — if a malformed line could mean we silently miss a real breach, I would want them queued and replayed rather than dropped.',
  },
  { id: 'm9', role: 'ai', text: 'Thanks, that is everything for this interview.' },
]

// Dictation is a browser capability, not a prop the screen computes, so the
// preview fakes a supported-but-idle mic to show the affordance.
const IDLE_DICTATION = {
  supported: true,
  listening: false,
  interim: '',
  error: '',
  toggle: () => {},
}

// ── Fetch mocks ─────────────────────────────────────────────────────────────

const json = (data) => new Response(
  JSON.stringify({ success: true, message: 'ok', data, ...(data.next_action ? data : {}) }),
  { status: 200, headers: { 'Content-Type': 'application/json' } },
)

const itemById = (id) => [...MCQ_ITEMS, ...FREE_TEXT_ITEMS, ...RANKING_ITEMS]
  .find((item) => item.item_attempt_id === id)

let mocksInstalled = false

function installMocks() {
  if (mocksInstalled) return
  mocksInstalled = true
  const realFetch = window.fetch.bind(window)

  window.fetch = async (url, options = {}) => {
    const target = String(typeof url === 'string' ? url : url?.url || '')
    const method = (options.method || 'GET').toUpperCase()

    if (target.includes('assessment-overview')) return json(OVERVIEW)
    if (target.includes('/public/demo/')) return json(DEMO)
    if (target.includes('timer-sync')) return json({ remaining_seconds: 1150 })

    const item = target.match(/\/items\/([^/?]+)\/(mcq|free-text|ranking)/)
    if (item) {
      // Autosave is a PUT. Acknowledge it and move on — the point of the
      // preview is the screens, not the persistence.
      if (method === 'PUT') return json({})
      const fixture = itemById(item[1])
      const seeded = SEEDED_ANSWERS[item[2].replace('-', '_')]?.[item[1]]
      return json({
        question: fixture?.question ?? null,
        response: item[2] === 'free-text'
          ? { response_text: seeded || '' }
          : item[2] === 'ranking'
            ? { ranked_option_ids: seeded || [] }
            : { selected_option_ids: seeded || [] },
      })
    }

    if (target.includes('/submit-all')) {
      return json({ next_action: 'assessment_complete', assessment_instance_id: 'preview' })
    }

    return realFetch(url, options)
  }
}

// ── Screens ─────────────────────────────────────────────────────────────────

// Every screen is mounted under a router, not just the ones that are pages.
// `ReportIssueLink` — which the flow shell now renders on each screen — reads
// `useParams` and `useLocation` to work out who is reporting, so a screen
// mounted outside a router throws. Giving each entry the route it would really
// be on also means the link resolves the identity it would really resolve.
function AtRoute({ path = '*', entry = '/', children }) {
  return (
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path={path} element={children} />
      </Routes>
    </MemoryRouter>
  )
}

function SectionExperience({ contentType }) {
  const items = ITEMS_BY_TYPE[contentType]

  // Walk past the section's own ExamIntro so the tile lands on the question
  // screen, which is what these three entries exist to show — the intro shape
  // has its own entry. The experience owns that transition internally and
  // exposes no prop for it, and adding one purely for a dev harness would be
  // production code paying for a preview.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const start = [...document.querySelectorAll('button')]
        .find((button) => /start section/i.test(button.textContent || ''))
      start?.click()
    }, 120)
    return () => window.clearTimeout(timer)
  }, [contentType])

  // Remount on type change so the experience restarts at its own intro.
  return (
    <CandidateMcqSectionExperience
      key={contentType}
      assessmentInstanceId="preview"
      sectionToken="preview-token"
      sectionId={`preview-${contentType}`}
      sectionName={contentType === 'mcq' ? 'System design judgement' : contentType === 'ranking' ? 'Incident triage order' : 'Incident write-up'}
      sectionItems={items.map((item, index) => ({ item_attempt_id: item.item_attempt_id, order: index }))}
      sectionTimerMinutes={20}
      sectionOrder={2}
      sectionCount={SECTIONS.length}
      contentType={contentType}
      onSubmitResult={async () => {}}
    />
  )
}

function BootPreview({ stage, elapsedMs, logLines }) {
  return (
    <ExamShell
      branding={BRANDING}
      centerStage
      topBar={(
        <ExamTopBar
          brand={<ExamBrand branding={BRANDING} fallback="Coding section" subtitle="Fix the double-charge bug" />}
        >
          <SectionStepperCompact currentIndex={0} count={SECTIONS.length} />
          <ConnectionStatus />
        </ExamTopBar>
      )}
    >
      <CandidateBootScreen
        stage={stage}
        elapsedMs={elapsedMs}
        logLines={logLines}
        maxWaitMs={180000}
      />
    </ExamShell>
  )
}

// One component for every adaptive-interview state, because on the real screen
// they ARE one component — `index.jsx` renders the chat, the end-interview
// confirmation and the farewell through the same `InterviewChatScreen`, swapping
// only the composer. Rebuilding them separately here would have hidden exactly
// the continuity that screen was designed around.
function InterviewPreview({ variant }) {
  const [composerValue, setComposerValue] = useState(
    variant === 'chat'
      ? 'The first two lines are a malformed tick — the consumer calls json.loads with no guard, so'
      : '',
  )

  if (variant === 'complete') {
    return (
      <ExamShell
        branding={BRANDING}
        topBar={(
          <AdaptiveInterviewTopBar
            branding={BRANDING}
            sectionName="Follow-up interview about your code"
            sectionOrder={1}
            sectionCount={SECTIONS.length}
            questionNumber={INTERVIEW_QUESTION_TOTAL}
            questionTotal={INTERVIEW_QUESTION_TOTAL}
            elapsedSeconds={643}
          />
        )}
      >
        <InterviewStatusPanel
          variant="complete"
          message="Thanks, that is everything for this interview. Your answers have been submitted."
        />
      </ExamShell>
    )
  }

  const farewell = variant === 'farewell'
  const ending = variant === 'ending'
  const thinking = variant === 'thinking'

  return (
    <InterviewChatScreen
      branding={BRANDING}
      sectionName="Follow-up interview about your code"
      sectionOrder={1}
      sectionCount={SECTIONS.length}
      questionNumber={farewell ? INTERVIEW_QUESTION_TOTAL : 2}
      questionTotal={INTERVIEW_QUESTION_TOTAL}
      remainingSeconds={farewell ? 402 : 870}
      scenario={farewell ? null : Q2_SCENARIO}
      scenarioSheetOpen={false}
      onScenarioSheetOpenChange={() => {}}
      messages={
        farewell
          ? INTERVIEW_FAREWELL_MESSAGES
          : thinking
            ? INTERVIEW_MESSAGES_ANSWERED
            : INTERVIEW_MESSAGES
      }
      thinking={thinking}
      thinkingLabel={thinking ? 'Reading your answer' : undefined}
      composerValue={composerValue}
      onComposerChange={setComposerValue}
      onSend={() => {}}
      composerDisabled={thinking}
      dictation={IDLE_DICTATION}
      onEndInterview={() => {}}
      closing={farewell ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] leading-[1.5] text-text-muted">Moving on to the next section.</p>
          <ExamButton>Continue (4)</ExamButton>
        </div>
      ) : ending ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] leading-[1.5] text-text-muted">
            End the interview now? The answers you gave are scored; the remaining questions are skipped.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-border-strong bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Keep going
            </button>
            <ExamButton>End interview</ExamButton>
          </div>
        </div>
      ) : null}
    />
  )
}

function IntroPreview() {
  return (
    <CandidateSectionIntroScreen
      eyebrow="Coding Section"
      title="Fix the double-charge bug"
      subtitle="Senior Backend Engineer — Payments"
      sectionCount={SECTIONS.length}
      currentIndex={0}
      stats={[
        { value: 'Coding', label: 'Format' },
        { value: 45, unit: 'min', label: 'On the clock' },
      ]}
      tips={[
        'You will work in a full editor in your browser — a real repository, not a text box.',
        'Starting a workspace takes up to a couple of minutes on a cold start. You only enter once it is genuinely reachable.',
        'Your work is saved as you go, but the section clock keeps running — it cannot be paused.',
      ]}
      actionContent="Start section"
      onAction={() => {}}
    />
  )
}

const SCREENS = [
  { key: 'landing', group: 'Funnel', label: 'Landing',
    path: CANDIDATE_ROUTES.landing, entry: '/assessment/preview',
    render: () => <AssessmentLandingPage /> },
  { key: 'terms', group: 'Funnel', label: 'Terms',
    path: CANDIDATE_ROUTES.terms, entry: '/assessment/preview/terms',
    render: () => <AssessmentTermsPage /> },
  { key: 'demo', group: 'Funnel', label: 'Public demo',
    path: CANDIDATE_ROUTES.demo, entry: '/demo/backend-screen',
    render: () => <PublicDemoPage /> },
  { key: 'intro', group: 'Funnel', label: 'Section intro',
    path: CANDIDATE_ROUTES.launch, entry: '/assessment/preview/launch',
    render: () => <IntroPreview /> },

  { path: CANDIDATE_ROUTES.section, entry: '/candidate/assessment/preview/sections/sec-1', key: 'boot-waiting', group: 'Coding', label: 'Boot · waiting', render: () => (
    <BootPreview
      stage="waiting"
      elapsedMs={47000}
      logLines={[
        '[gateway] container address received · polling readiness',
        '[probe]   attempt 1 · not ready yet',
        '[probe]   attempt 2 · not ready yet',
        '[probe]   attempt 3 · not ready yet',
      ]}
    />
  ) },
  { path: CANDIDATE_ROUTES.section, entry: '/candidate/assessment/preview/sections/sec-1', key: 'boot-entering', group: 'Coding', label: 'Boot · entering', render: () => (
    <BootPreview
      stage="entering"
      elapsedMs={62000}
      logLines={[
        '[gateway] container address received · polling readiness',
        '[probe]   attempt 1 · not ready yet',
        '[theia]   workspace reachable · opening editor',
      ]}
    />
  ) },

  { path: CANDIDATE_ROUTES.section, entry: '/candidate/assessment/preview/sections/sec-1', key: 'interview-intro', group: 'Interview', label: 'Intro', render: () => (
    <CandidateSectionIntroScreen
      eyebrow="AI Interview Section"
      title="Follow-up interview about your code"
      subtitle="Senior Backend Engineer — Payments"
      sectionCount={SECTIONS.length}
      currentIndex={1}
      stats={[
        { value: 'Interview', label: 'Format' },
        { value: 15, unit: 'min', label: 'On the clock' },
      ]}
      tips={[
        'A short conversation with an AI interviewer. Type your answers, or tap the mic and talk.',
        'The clock starts when the first question appears, not on this screen.',
        'You can end the interview early from the top bar; the answers you gave are still scored.',
      ]}
      actionContent="Start Section"
      onAction={() => {}}
    />
  ) },
  { path: CANDIDATE_ROUTES.section, entry: '/candidate/assessment/preview/sections/sec-1', key: 'interview-chat', group: 'Interview', label: 'Chat', render: () => <InterviewPreview variant="chat" /> },
  { path: CANDIDATE_ROUTES.section, entry: '/candidate/assessment/preview/sections/sec-1', key: 'interview-thinking', group: 'Interview', label: 'Thinking', render: () => <InterviewPreview variant="thinking" /> },
  { path: CANDIDATE_ROUTES.section, entry: '/candidate/assessment/preview/sections/sec-1', key: 'interview-ending', group: 'Interview', label: 'End confirm', render: () => <InterviewPreview variant="ending" /> },
  { path: CANDIDATE_ROUTES.section, entry: '/candidate/assessment/preview/sections/sec-1', key: 'interview-farewell', group: 'Interview', label: 'Farewell', render: () => <InterviewPreview variant="farewell" /> },
  { path: CANDIDATE_ROUTES.section, entry: '/candidate/assessment/preview/sections/sec-1', key: 'interview-complete', group: 'Interview', label: 'Complete', render: () => <InterviewPreview variant="complete" /> },

  { path: CANDIDATE_ROUTES.section, entry: '/candidate/assessment/preview/sections/sec-1', key: 'mcq', group: 'Sections', label: 'MCQ', render: () => <SectionExperience contentType="mcq" /> },
  { path: CANDIDATE_ROUTES.section, entry: '/candidate/assessment/preview/sections/sec-1', key: 'free_text', group: 'Sections', label: 'Written', render: () => <SectionExperience contentType="free_text" /> },
  { path: CANDIDATE_ROUTES.section, entry: '/candidate/assessment/preview/sections/sec-1', key: 'ranking', group: 'Sections', label: 'Ranking', render: () => <SectionExperience contentType="ranking" /> },

  { path: CANDIDATE_ROUTES.complete, entry: '/candidate/assessment/preview/complete', key: 'feedback', group: 'End states', label: 'Experience survey', render: () => (
    // Note: clicking "Send feedback" here fires a REAL submission to the live
    // Google Form (see api/candidate/experienceFeedback.js) — this screen is
    // wired the same way in the preview as it is in production, so a click is
    // a click. Use "Skip" while browsing the gallery.
    <CandidateExperienceFeedbackScreen branding={BRANDING} onDone={() => {}} />
  ) },
  { path: CANDIDATE_ROUTES.complete, entry: '/candidate/assessment/preview/complete', key: 'complete', group: 'End states', label: 'Complete', render: () => (
    <CandidateCompletionScreen
      message="Everything you worked on has been submitted. You can close this tab."
      sections={SECTIONS}
    />
  ) },
  { key: 'loading', group: 'End states', label: 'Loading', render: () => (
    <CandidateCenteredLoadingState label="Loading assessment…" />
  ) },
  { key: 'error', group: 'End states', label: 'Error', render: () => (
    <CandidateCenteredErrorState
      title="Unable to load assessment"
      message="This link may be invalid or expired."
    />
  ) },
]

// ── Harness ─────────────────────────────────────────────────────────────────

// ── Contact sheet ───────────────────────────────────────────────────────────
// `?sheet=1` renders every screen at once, each in its own iframe laid out at a
// real desktop viewport and CSS-scaled down to a tile. Iframes rather than
// direct mounts because these screens are `h-screen` and full-bleed: thirteen
// of them in one document would each claim the whole viewport. This is the
// "show me everything" view; the switcher below is the "look closely at one"
// view.
const SHEET_WIDTH = 1440
const SHEET_HEIGHT = 900

function ContactSheet() {
  const [scale, setScale] = useState(0.34)
  // Mount the iframes one at a time. Thirteen at once each pull the whole
  // unbundled dev app down, which exhausts the browser's connection pool and
  // every tile comes back ERR_INSUFFICIENT_RESOURCES — a blank contact sheet.
  // Each tile advances the cursor when it loads (or after a timeout, so one
  // slow frame cannot stall the rest).
  const [mounted, setMounted] = useState(1)
  const advance = () => setMounted((count) => Math.min(count + 1, SCREENS.length))

  // The sheet is taller than one viewport and the app's body keeps the light
  // recruiter page colour, so scrolling past the wrapper revealed a white band
  // under the tiles.
  useEffect(() => {
    const previous = document.body.style.backgroundColor
    document.body.style.backgroundColor = '#141110'
    return () => { document.body.style.backgroundColor = previous }
  }, [])

  useEffect(() => {
    if (mounted >= SCREENS.length) return undefined
    const timer = window.setTimeout(advance, 4000)
    return () => window.clearTimeout(timer)
  }, [mounted])

  return (
    <div className="min-h-screen bg-[#141110] px-5 py-6 text-white">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-white">Candidate flow — every screen</h1>
            <p className="mt-1 text-[13px] text-white/45">
              Each tile is the real screen running at {SHEET_WIDTH}×{SHEET_HEIGHT}. Click a title to open it full size.
            </p>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-white/45">
            Zoom
            <input
              type="range"
              min="0.2"
              max="0.75"
              step="0.01"
              value={scale}
              onChange={(event) => setScale(Number(event.target.value))}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-5">
          {SCREENS.map((entry, index) => (
            <div key={entry.key} className="flex flex-col gap-2">
              <a
                href={`/__exam-preview?screen=${entry.key}`}
                className="text-[12px] font-medium text-white/70 hover:text-[#FF8528]"
              >
                <span className="text-white/30">{entry.group} · </span>{entry.label}
              </a>
              <div
                className="overflow-hidden rounded-xl border border-white/10 bg-black"
                style={{ width: SHEET_WIDTH * scale, height: SHEET_HEIGHT * scale }}
              >
                {index < mounted ? (
                  <iframe
                    title={entry.label}
                    src={`/__exam-preview?screen=${entry.key}&bare=1`}
                    width={SHEET_WIDTH}
                    height={SHEET_HEIGHT}
                    onLoad={advance}
                    style={{
                      border: 0,
                      transform: `scale(${scale})`,
                      transformOrigin: 'top left',
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] text-white/25">
                    queued…
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ExamPreview() {
  const params = new URLSearchParams(window.location.search)
  const sheet = params.get('sheet') === '1'
  // `bare=1` is what the contact sheet's iframes load: the screen with no
  // switcher pill sitting in the corner of every tile.
  const bare = params.get('bare') === '1'

  const [active, setActive] = useState(() => {
    const requested = params.get('screen')
    return SCREENS.some((entry) => entry.key === requested) ? requested : 'landing'
  })
  const [open, setOpen] = useState(false)

  useMemo(() => {
    installMocks()
    // The flow shell reads branding from session storage, same as in a real run.
    saveCandidateBranding(BRANDING)
  }, [])

  if (sheet) return <ContactSheet />

  const screen = SCREENS.find((entry) => entry.key === active) ?? SCREENS[0]
  const groups = [...new Set(SCREENS.map((entry) => entry.group))]

  return (
    <div className="relative">
      {/* Remount per screen: several of these own timers, boot state or an
          intro step, and carrying that across a switch shows the wrong one. */}
      <div key={screen.key}>
        <AtRoute path={screen.path} entry={screen.entry}>
          {screen.render()}
        </AtRoute>
      </div>

      {!bare && (
      <>
      {/* A collapsed pill bottom-LEFT that opens a list UPWARDS. Every screen
          here puts its primary action at the bottom-right of its own action
          bar, and a horizontal switcher along the bottom covered the button
          under review — which is the one thing this page exists to show. */}
      <div className="fixed bottom-0 left-0 z-[9999] flex flex-col items-start gap-1.5 p-2.5">
        {open && (
          <div className="max-h-[70vh] w-[200px] overflow-y-auto rounded-xl border border-white/12 bg-black/90 p-1.5 shadow-2xl backdrop-blur-xl">
            <a
              href="/__exam-preview?sheet=1"
              className="mb-1 block rounded-lg px-2 py-1.5 text-[12px] font-medium text-white/50 hover:bg-white/10 hover:text-white"
            >
              All screens ▦
            </a>
            {groups.map((group) => (
              <div key={group} className="mb-1 last:mb-0">
                <p className="px-2 py-1 text-[9.5px] uppercase tracking-[0.12em] text-white/30">
                  {group}
                </p>
                {SCREENS.filter((entry) => entry.group === group).map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => setActive(entry.key)}
                    className={`block w-full rounded-lg px-2 py-1.5 text-left text-[12px] font-medium transition-colors ${
                      entry.key === active
                        ? 'bg-[#FF8528] text-[#1C0E04]'
                        : 'text-white/65 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-2 rounded-xl border border-white/12 bg-black/88 px-2.5 py-1.5 shadow-2xl backdrop-blur-xl transition-colors hover:border-white/25"
        >
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-white/35">
            Preview
          </span>
          <span className="text-[12px] font-medium text-white/85">{screen.label}</span>
          <span className="text-[10px] text-white/40">{open ? '▾' : '▴'}</span>
        </button>
      </div>

      </>
      )}
    </div>
  )
}
