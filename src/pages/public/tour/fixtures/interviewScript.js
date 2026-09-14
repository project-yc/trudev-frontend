// The follow-up interview shown in the tour. Preset `coding_task_followup`:
// the questions are anchored on the candidate's own submission — the diff,
// the AI suggestion they changed, the task's suggested probes. The engine asks
// at most one follow-up ("nudge") per question, which is what happens on Q1.

export const INTERVIEW_QUESTION_TOTAL = 3;

export const Q1 =
  "You started from the assistant's in-memory fix, then moved alert state into SQLite. Walk me through what happens to alert #4412 if the worker restarts halfway through a sustained breach.";

export const A1_THIN = "It keeps working, because the state is in the database now.";

export const NUDGE_1 =
  "Be specific. After the restart, the first tick is still above 190. What does your engine read, and why doesn't it fire again?";

export const A1_FULL =
  "It reads last_condition = 1 for 4412 from alert_state, so a price above 190 isn't a new crossing and nothing fires. With the assistant's dict, the restart empties it, the first tick looks like a fresh crossing, and everyone mid-breach gets a duplicate after every deploy.";

export const Q2 =
  "That's the failure mode. Different angle: it's 2am and these lines show up in the worker logs. What's happening, and what does your engine do with each tick?";

export const A2 =
  "The first two lines are a malformed tick. The consumer calls json.loads with no guard, so that exception takes the worker down. I'd log it with the raw line and skip it; a dead-letter queue is overkill for now. The last line is fine: seq 2230 is behind the watermark, so it's dropped on purpose.";

export const Q3 =
  "Last one. In DECISIONS.md you chose log-and-skip for bad input. What would make you change that decision?";

export const Q2_SCENARIO = {
  title: 'Worker logs · 02:14 UTC',
  sections: [
    {
      id: 'brief',
      type: 'prose',
      label: 'Context',
      body: 'The alert worker for Tickr, running your version of the engine. MarketPulse had a partial outage at 02:10 and is replaying buffered ticks.',
    },
    {
      id: 'log',
      type: 'log',
      label: 'alert-worker · stderr',
      tone: 'error',
      defaultExpanded: true,
      lines: [
        '02:14:07 ERROR feed_consumer  json.decoder.JSONDecodeError: Expecting \',\' delimiter: line 1 column 58',
        '02:14:07 ERROR feed_consumer  raw={"event_id": "mp-nvda-2231", "symbol": "NVDA" "price": 191.4, …',
        '02:14:08 INFO  engine         tick mp-nvda-2232 accepted seq=2232',
        '02:14:08 INFO  engine         tick mp-nvda-2230 rejected reason=stale',
      ],
    },
  ],
};

/** What the interviewer had in hand before asking anything. */
export const INTERVIEW_GROUNDING = [
  { label: 'Their diff', value: 'app/engine.py · +41 −9' },
  { label: 'AI usage', value: '1 prompt · suggestion applied, then rewritten' },
  { label: 'Tests', value: 'Visible 6/6 · hidden 10/10' },
  { label: 'Their written answers', value: 'DECISIONS.md, 2 answers' },
  { label: 'Suggested probes', value: 'Restart mid-breach · bad input at 2am' },
];
