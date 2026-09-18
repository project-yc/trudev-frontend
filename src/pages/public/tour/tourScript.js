// The tour's storyline: chapters → steps → beats.
//
// A STEP is one narrator card: a title, ≤30 words of body copy, and the
// `data-tour` element on stage to spotlight. A BEAT is one scripted thing
// that happens on stage while that step is showing (a terminal line, an AI
// reply, a file opening), played in order after `wait` ms.
//
// Each chapter's stage state is never stored — it is rebuilt by folding every
// beat up to the current one through the chapter's `reduce`. That is what lets
// Back, the chapter rail and "skip to report" land on any step in the exact
// state it would have reached by playing through.

import {
  AI_PROMPT,
  AI_REPLY,
  ENGINE_AI,
  ENGINE_FINAL,
  TASK_FILES,
  TERM_PYTEST,
  TERM_REPLAY_AFTER,
  TERM_REPLAY_BEFORE,
} from './fixtures/codingTask';
import {
  A1_FULL,
  A1_THIN,
  A2,
  NUDGE_1,
  Q1,
  Q2,
  Q2_SCENARIO,
  Q3,
} from './fixtures/interviewScript';
import { ROADMAP_AS_LIVE } from './tourConfig';

// ─── Chapter 1: the coding task ──────────────────────────────────────────────

const ENGINE_AI_SNIPPET = ENGINE_AI.slice(ENGINE_AI.indexOf('# Remember'));

const CODING_INITIAL = {
  files: Object.fromEntries(TASK_FILES.map(f => [f.path, f.content])),
  openTabs: ['TICKET.md'],
  active: 'TICKET.md',
  modified: [],
  terminal: [],
  chat: [],
  aiThinking: false,
  signals: [],
  submitted: false,
  grade: null,
  // Which part of the workspace the latest beat happened in. The desktop stage
  // shows every pane at once and ignores it; the phone stage shows one pane at
  // a time and follows it.
  focus: 'code',
};

function openTab(view, path) {
  return {
    ...view,
    active: path,
    focus: 'code',
    openTabs: view.openTabs.includes(path) ? view.openTabs : [...view.openTabs, path],
  };
}

const withFocus = (view, focus) => ({ ...view, focus });

function reduceCoding(view, beat) {
  switch (beat.t) {
    case 'open':
      return openTab(view, beat.path);
    case 'cmd':
      return { ...view, focus: 'terminal', terminal: [...view.terminal, { kind: 'cmd', text: beat.text }] };
    case 'out':
      return { ...view, focus: 'terminal', terminal: [...view.terminal, ...beat.lines] };
    case 'user':
      return { ...view, focus: 'ai', chat: [...view.chat, { role: 'user', text: beat.text }] };
    case 'thinking':
      return { ...view, focus: 'ai', aiThinking: beat.on };
    case 'ai':
      return {
        ...view,
        focus: 'ai',
        aiThinking: false,
        chat: [...view.chat, { role: 'ai', text: beat.text, code: beat.code, applied: false }],
      };
    case 'apply': {
      const chat = view.chat.map((m, i) => (i === view.chat.length - 1 ? { ...m, applied: true } : m));
      // Stays on the chat: a phone shows one pane, and the reply with its
      // "Applied" tick is what this beat is about.
      return withFocus(openTab({
        ...view,
        chat,
        files: { ...view.files, 'app/engine.py': ENGINE_AI },
        modified: [...new Set([...view.modified, 'app/engine.py'])],
      }, 'app/engine.py'), 'ai');
    }
    case 'edit':
      return openTab({
        ...view,
        files: { ...view.files, [beat.path]: beat.content },
        modified: [...new Set([...view.modified, beat.path])],
      }, beat.path);
    case 'signal':
      return {
        ...view,
        signals: [...view.signals, { name: beat.name, detail: beat.detail, at: beat.at }],
      };
    case 'submit':
      return { ...view, focus: 'code', submitted: true };
    case 'grade':
      return { ...view, focus: 'code', grade: beat.result };
    default:
      return view;
  }
}

const CODING_STEPS = [
  {
    id: 'ticket',
    target: 'editor',
    title: 'A real ticket in a real repo',
    body: 'No puzzles. TDV-4412 is a production bug in a 16-file Python codebase with a SQLite schema and a recorded feed. 75 minutes, AI assistant included.',
    beats: [
      { t: 'signal', wait: 500, name: 'task_opened', detail: 'TDV-4412 · Alert engine misfiring', at: '00:00' },
      { t: 'signal', wait: 900, name: 'acceptance_criteria_read', detail: 'TICKET.md · Acceptance', at: '00:41' },
      { t: 'open', wait: 1100, path: 'app/engine.py' },
      { t: 'signal', wait: 100, name: 'file_opened', detail: 'app/engine.py', at: '01:12' },
    ],
  },
  {
    id: 'reproduce',
    target: 'terminal',
    title: 'First, they reproduce the bug',
    body: "Before changing anything, Priya replays last night's feed: 30 notifications went out. TruDev records every command and file opened, not just the final diff.",
    beats: [
      { t: 'cmd', wait: 500, text: 'python tools/replay.py' },
      { t: 'signal', wait: 150, name: 'terminal_command_executed', detail: 'python tools/replay.py', at: '03:05' },
      { t: 'out', wait: 900, lines: TERM_REPLAY_BEFORE },
      { t: 'signal', wait: 300, name: 'script_executed', detail: 'replay → 30 notifications', at: '03:06' },
    ],
  },
  {
    id: 'ai',
    target: 'ai-chat',
    title: 'Then they ask the AI, like at work',
    body: 'AI is allowed, at the level you choose. The assistant suggests an in-memory fix. TruDev logs the prompt, the reply, and whether the code was applied.',
    beats: [
      { t: 'user', wait: 500, text: AI_PROMPT },
      { t: 'signal', wait: 150, name: 'llm_assist_prompt_sent', detail: '"…fires once per crossing… keep the signature"', at: '06:12' },
      { t: 'thinking', wait: 200, on: true },
      { t: 'ai', wait: 1700, text: AI_REPLY, code: ENGINE_AI_SNIPPET },
      { t: 'signal', wait: 150, name: 'llm_assist_response_received', detail: 'explanation + 24-line code block', at: '06:19' },
      { t: 'apply', wait: 1200 },
      { t: 'signal', wait: 150, name: 'llm_assist_code_applied', detail: 'app/engine.py', at: '06:48' },
    ],
  },
  {
    id: 'green',
    target: 'terminal',
    title: 'Tests pass. Most take-homes stop grading here.',
    body: "All 6 visible tests are green. But the fix keeps its state in memory, and nothing in the ticket says that's wrong.",
    beats: [
      { t: 'cmd', wait: 500, text: 'pytest tests/ -v' },
      { t: 'signal', wait: 150, name: 'run_tests', detail: 'pytest tests/ -v', at: '07:30' },
      { t: 'out', wait: 900, lines: TERM_PYTEST },
      { t: 'signal', wait: 200, name: 'tests_passed', detail: '6 passed · visible suite', at: '07:31' },
    ],
  },
  {
    id: 'context',
    target: 'editor',
    title: 'The repo holds the real requirements',
    body: 'PRODUCT_NOTES.md says the worker restarts on every deploy, so an in-memory fix re-fires alerts after each one. Priya rewrites the AI code to keep state in SQLite.',
    beats: [
      { t: 'open', wait: 500, path: 'docs/PRODUCT_NOTES.md' },
      { t: 'signal', wait: 150, name: 'file_opened', detail: 'docs/PRODUCT_NOTES.md', at: '09:02' },
      { t: 'open', wait: 1500, path: 'schema.sql' },
      { t: 'signal', wait: 150, name: 'file_opened', detail: 'schema.sql · alert_state, symbol_watermarks', at: '10:15' },
      { t: 'edit', wait: 1400, path: 'app/engine.py', content: ENGINE_FINAL },
      { t: 'signal', wait: 150, name: 'ai_code_modified', detail: '3 of 4 AI-written blocks rewritten', at: '22:40' },
      { t: 'cmd', wait: 900, text: 'python tools/replay.py' },
      { t: 'out', wait: 700, lines: TERM_REPLAY_AFTER },
      { t: 'signal', wait: 150, name: 'script_executed', detail: 'replay → 4 notifications', at: '41:57' },
    ],
  },
  {
    id: 'submit',
    target: 'submit',
    title: "Hidden tests decide what 'correct' means",
    body: '10 hidden tests cover restarts, duplicate delivery and same-second ticks. In our testing, no AI model passed them from the ticket alone. Priya passes 10/10.',
    beats: [
      { t: 'cmd', wait: 500, text: 'pytest tests/ -v' },
      { t: 'out', wait: 700, lines: [TERM_PYTEST[TERM_PYTEST.length - 1]] },
      { t: 'signal', wait: 150, name: 'tests_passed', detail: '6 passed · visible suite', at: '48:10' },
      { t: 'submit', wait: 900 },
      { t: 'signal', wait: 150, name: 'session_submitted', detail: '21 minutes left on the clock', at: '53:44' },
      { t: 'grade', wait: 1600, result: { visible: '6/6', hidden: '10/10' } },
    ],
  },
];

// ─── Chapter 2: the follow-up interview ─────────────────────────────────────

const INTERVIEW_INITIAL = {
  messages: [],
  thinking: false,
  composer: '',
  scenario: null,
  question: 0,
};

function reduceInterview(view, beat) {
  switch (beat.t) {
    case 'question':
      return { ...view, question: beat.n };
    case 'thinking':
      return { ...view, thinking: beat.on };
    case 'ai':
      return {
        ...view,
        thinking: false,
        messages: [...view.messages, {
          id: `m${view.messages.length}`, role: 'ai', text: beat.text, isNudge: Boolean(beat.nudge),
        }],
      };
    case 'type':
      return { ...view, composer: beat.text };
    case 'send':
      return {
        ...view,
        composer: '',
        messages: [...view.messages, { id: `m${view.messages.length}`, role: 'candidate', text: view.composer }],
      };
    case 'scenario':
      return { ...view, scenario: beat.scenario };
    default:
      return view;
  }
}

// `send` waits long enough for the composer's typewriter to finish the answer.
const sendWait = text => 900 + text.length * 7;

// No `target` on any of these steps — the reused InterviewChatScreen takes up
// almost the entire stage on its own, so a ring around "main" would have
// outlined nearly the whole screen and marked nothing in particular. The
// conversation itself is the point here; nothing needs to be pointed at.
const INTERVIEW_STEPS = [
  {
    id: 'open',
    title: 'Next, an interview about their own code',
    body: 'Right after submitting, Priya gets a short AI interview. The first question comes straight from the diff: the AI suggestion Priya rewrote.',
    beats: [
      { t: 'question', wait: 0, n: 1 },
      { t: 'thinking', wait: 300, on: true },
      { t: 'ai', wait: 1800, text: Q1 },
    ],
  },
  {
    id: 'nudge',
    title: 'Vague answers get a follow-up',
    body: "Priya's first answer is thin. Instead of moving on, the interviewer narrows the question, the way a good senior engineer would.",
    beats: [
      { t: 'type', wait: 400, text: A1_THIN },
      { t: 'send', wait: sendWait(A1_THIN) },
      { t: 'thinking', wait: 300, on: true },
      { t: 'ai', wait: 1700, text: NUDGE_1, nudge: true },
    ],
  },
  {
    id: 'scenario',
    title: 'Real artifacts, not trivia',
    body: "Priya explains the restart case precisely. The next question puts a 2am production log in the side panel and asks what's going on.",
    // Phones have no side panel: the log sits in a drawer under the chat instead.
    bodyCompact: "Priya explains the restart case precisely. The next question comes with a 2am production log, shown under the question, and asks what's going on.",
    beats: [
      { t: 'type', wait: 400, text: A1_FULL },
      { t: 'send', wait: sendWait(A1_FULL) },
      { t: 'thinking', wait: 300, on: true },
      { t: 'question', wait: 0, n: 2 },
      { t: 'scenario', wait: 1500, scenario: Q2_SCENARIO },
      { t: 'ai', wait: 200, text: Q2 },
    ],
  },
  {
    id: 'close',
    title: "A pasted fix doesn't survive this",
    body: "Every question is built from the candidate's own code, test results and AI usage. Someone who pasted the fix can't explain it, and the transcript shows it.",
    beats: [
      { t: 'type', wait: 400, text: A2 },
      { t: 'send', wait: sendWait(A2) },
      { t: 'thinking', wait: 300, on: true },
      { t: 'question', wait: 0, n: 3 },
      { t: 'ai', wait: 1700, text: Q3 },
    ],
  },
];

// ─── Chapter 3: the hiring manager's report ─────────────────────────────────

const REPORT_INITIAL = { selected: 'priya' };

function reduceReport(view, beat) {
  if (beat.t === 'select') return { ...view, selected: beat.id };
  return view;
}

const REPORT_STEPS = [
  {
    id: 'shortlist',
    target: 'report-shortlist',
    title: 'Same green checkmarks. Very different engineers.',
    body: 'Both candidates passed all 6 visible tests. Hidden tests, how they used AI, and the interview are what separate them.',
    beats: [{ t: 'select', wait: 0, id: 'priya' }],
  },
  {
    id: 'hero',
    target: 'report-hero',
    title: 'One page per candidate',
    body: 'An overall signal, a score per section, hidden-test results and review status. Evidence to support your decision, not an automated verdict.',
    beats: [],
  },
  {
    id: 'coding',
    target: 'report-coding',
    title: 'How they used AI, not just whether',
    body: 'Four rubric dimensions, including AI collaboration: what Priya asked, what was accepted, what was rewritten, and whether it was tested afterwards.',
    beats: [],
  },
  {
    id: 'interview',
    target: 'report-interview',
    title: 'The interview, scored with quotes',
    body: "Each competency is scored 0–4 with the candidate's own words as evidence, next to the full transcript and whether they needed prompting.",
    beats: [],
  },
  {
    id: 'jordan',
    target: 'report-hero',
    title: 'Now the one who pasted the fix',
    body: 'Jordan accepted the AI code unchanged and never opened the product notes: 6 of 10 hidden tests and a thin interview. Flagged for human review.',
    beats: [{ t: 'select', wait: 300, id: 'jordan' }],
  },
];

// ─── Chapter 4: everything else ─────────────────────────────────────────────

const FORMATS_INITIAL = { tab: 'mcq' };

function reduceFormats(view, beat) {
  if (beat.t === 'tab') return { ...view, tab: beat.id };
  return view;
}

const FORMATS_STEPS = [
  {
    id: 'questions',
    target: 'formats-list',
    title: 'Build the whole loop in one place',
    body: 'Mix coding tasks with multiple choice, ranking and written answers. Try one: every format here is the real candidate screen.',
    beats: [{ t: 'tab', wait: 0, id: 'mcq' }],
  },
  {
    id: 'modes',
    target: 'formats-preview',
    title: 'Interview modes for every round',
    body: ROADMAP_AS_LIVE
      ? 'Résumé deep dives, rounds built from your own docs, behavioral and scenario rounds, each calibrated from intern to principal.'
      : 'Code-aware and scenario rounds today. Résumé deep dives, rounds built from your own docs and behavioral rounds are coming soon.',
    beats: [{ t: 'tab', wait: 300, id: 'resume' }],
  },
];

// ─── The chapter list ───────────────────────────────────────────────────────

export const CHAPTERS = [
  { id: 'intro', label: 'Start', steps: [{ id: 'intro', beats: [] }], screen: true },
  {
    id: 'task', label: 'The task', short: 'Task', steps: CODING_STEPS,
    initial: CODING_INITIAL, reduce: reduceCoding,
  },
  {
    id: 'interview', label: 'The interview', short: 'Interview', steps: INTERVIEW_STEPS,
    initial: INTERVIEW_INITIAL, reduce: reduceInterview,
  },
  {
    id: 'report', label: 'Your report', short: 'Report', steps: REPORT_STEPS,
    initial: REPORT_INITIAL, reduce: reduceReport,
  },
  {
    id: 'formats', label: 'More formats', short: 'Formats', steps: FORMATS_STEPS,
    initial: FORMATS_INITIAL, reduce: reduceFormats,
  },
  { id: 'outro', label: 'Next steps', steps: [{ id: 'outro', beats: [] }], screen: true },
];

/** Every (chapter, step) the viewer can land on, in order. */
export function buildPositions() {
  return CHAPTERS
    .flatMap(chapter => chapter.steps.map((step, stepIndex) => ({
      chapterId: chapter.id,
      stepIndex,
      stepId: step.id,
    })));
}

export function getChapter(id) {
  return CHAPTERS.find(chapter => chapter.id === id);
}

/** Stage state for a chapter at `stepIndex`, with `shown` beats of that step played. */
export function foldChapterView(chapter, stepIndex, shown) {
  if (!chapter?.reduce) return null;
  const played = chapter.steps
    .slice(0, stepIndex)
    .flatMap(step => step.beats || [])
    .concat((chapter.steps[stepIndex]?.beats || []).slice(0, shown));
  return played.reduce(chapter.reduce, chapter.initial);
}
