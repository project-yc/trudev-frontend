// TEMPORARY design preview — mock data, no API. Delete before merge.
import { useEffect, useState } from 'react'
import { IconArrowLeft, IconArrowRight, IconEraser, IconLayoutGrid } from '@tabler/icons-react'
import ExamShell, {
  ExamActionBar,
  ExamProgress,
  ExamSidebar,
  ExamTopBar,
} from '../../components/candidate/exam/ExamShell'
import ExamButton from '../../components/candidate/exam/ExamButton'
import ExamTimer from '../../components/candidate/exam/ExamTimer'
import {
  AutoSaveChip,
  ConnectionStatus,
  ExamBrand,
  FullscreenToggle,
} from '../../components/candidate/exam/ExamStatus'
import QuestionMap, { QuestionMapLegend } from '../../components/candidate/exam/QuestionMap'
import QuestionMapSheet from '../../components/candidate/exam/QuestionMapSheet'
import QuestionStage from '../../components/candidate/exam/QuestionStage'
import {
  SAMPLE_FREE_TEXT,
  SAMPLE_MCQ_MULTI,
  SAMPLE_MCQ_SINGLE,
  SAMPLE_RANKING,
} from '../public/tour/fixtures/formats'

const QUESTIONS = [
  SAMPLE_MCQ_SINGLE,
  SAMPLE_MCQ_MULTI,
  ...Array.from({ length: 23 }, (_, i) => ({
    item_attempt_id: `a${i + 3}`, points: 1,
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

const FREE_TEXT = [
  ...SAMPLE_FREE_TEXT,
  ...Array.from({ length: 6 }, (_, i) => ({ item_attempt_id: `f${i + 3}`, points: 3,
    question: { prompt: `Written prompt ${i + 3} — explain your reasoning in a short paragraph.`, word_limit: 150 } })),
]

const RANKING = [
  SAMPLE_RANKING,
  ...Array.from({ length: 7 }, (_, i) => ({ item_attempt_id: `r${i + 2}`, points: 2,
    question: { prompt: `Ranking prompt ${i + 2} — order these by priority.`,
      options: [
        { id: 1, text: 'First candidate item' },
        { id: 2, text: 'Second candidate item' },
        { id: 3, text: 'Third candidate item' },
      ] } })),
]

const SETS = { mcq: QUESTIONS, free_text: FREE_TEXT, ranking: RANKING }
const TYPE_LABELS = { mcq: 'MCQ', free_text: 'Free text', ranking: 'Ranking' }

export default function ExamPreview() {
  const [contentType, setContentType] = useState('mcq')
  const [answersByType, setAnswersByType] = useState({ mcq: { a1: ['2'], a3: ['1'], a4: ['1'], a5: ['2'] }, free_text: {}, ranking: {} })
  const [visited, setVisited] = useState({ a1: true, a2: true, a3: true, a4: true, a5: true, a6: true })
  const answers = answersByType[contentType]
  const setAnswers = (fn) => setAnswersByType((p) => ({ ...p, [contentType]: typeof fn === 'function' ? fn(p[contentType]) : fn }))
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [mapOpen, setMapOpen] = useState(false)
  const [seconds, setSeconds] = useState(6299)
  const [elapsed, setElapsed] = useState(0)

  const questions = SETS[contentType]
  const total = questions.length
  const isAnswered = (v) => (contentType === 'free_text' ? !!(v || '').trim() : (v || []).length > 0)
  const answered = questions.filter((q) => isAnswered(answers[q.item_attempt_id])).length
  const current = questions[Math.min(index, total - 1)]
  const currentAnswer = answers[current.item_attempt_id] ?? (contentType === 'free_text' ? '' : [])

  useEffect(() => {
    const id = setInterval(() => { setSeconds((s) => Math.max(s - 1, 0)); setElapsed((e) => e + 1) }, 1000)
    return () => clearInterval(id)
  }, [])

  const statuses = questions.map((q) => ({
    answered: isAnswered(answers[q.item_attempt_id]),
    visited: !!visited[q.item_attempt_id],
  }))

  const goTo = (i) => {
    const next = Math.min(Math.max(i, 0), total - 1)
    setDirection(next >= index ? 1 : -1)
    setIndex(next)
    const id = questions[next].item_attempt_id
    setVisited((p) => (p[id] ? p : { ...p, [id]: true }))
  }


  return (
    <ExamShell
      topBar={(
        <ExamTopBar brand={<ExamBrand fallback="QualifyPro" />}>
          <div className="flex items-center gap-1 rounded-lg border border-border-strong bg-surface-muted p-0.5">
            {Object.keys(SETS).map((t) => (
              <button key={t} type="button"
                onClick={() => { setContentType(t); setIndex(0) }}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${contentType === t ? 'bg-brand text-on-brand' : 'text-text-muted hover:text-text-primary'}`}>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <AutoSaveChip savedAt={JSON.stringify(answers)} />
          <ExamTimer remainingSeconds={seconds} elapsedSeconds={elapsed} />
          <ConnectionStatus />
          <FullscreenToggle />
        </ExamTopBar>
      )}
      sidebar={(
        <ExamSidebar
          title="Question Navigator"
          subtitle={`${total - answered} questions remaining`}
          legend={<QuestionMapLegend />}
          action={<ExamButton variant="outline" size="lg" className="w-full">Finish section</ExamButton>}
        >
          <QuestionMap statuses={statuses} currentIndex={index} onJump={goTo} />
        </ExamSidebar>
      )}
      progress={<ExamProgress value={answered} total={total} />}
      actionBar={(
        <ExamActionBar>
          <ExamButton variant="quiet" size="icon" className="lg:hidden" onClick={() => setMapOpen(true)}>
            <IconLayoutGrid size={18} />
          </ExamButton>
          <ExamButton variant="quiet" onClick={() => goTo(index - 1)} disabled={index === 0}>
            <IconArrowLeft size={16} />
            <span className="hidden sm:inline">Previous</span>
          </ExamButton>
          <ExamButton
            variant="quiet"
            onClick={() => setAnswers((p) => ({ ...p, [current.item_attempt_id]: contentType === 'free_text' ? '' : [] }))}
            disabled={!isAnswered(currentAnswer)}
          >
            <IconEraser size={16} />
            <span className="hidden sm:inline">Clear</span>
          </ExamButton>
          <span className="flex-1" />
          <ExamButton onClick={() => goTo(index + 1)} sweep={index === total - 1}>
            {index === total - 1 ? 'Finish section' : 'Next'}
            <IconArrowRight size={16} />
          </ExamButton>
        </ExamActionBar>
      )}
    >
      <QuestionStage
        question={current}
        index={Math.min(index, total - 1)}
        contentType={contentType}
        answer={currentAnswer}
        onAnswerChange={(value) => setAnswers((p) => ({ ...p, [current.item_attempt_id]: value }))}
        direction={direction}
      />
      <QuestionMapSheet
        open={mapOpen}
        onOpenChange={setMapOpen}
        statuses={statuses}
        currentIndex={index}
        onJump={(i) => { goTo(i); setMapOpen(false) }}
      />
    </ExamShell>
  )
}
