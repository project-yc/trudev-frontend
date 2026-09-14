// Report fixtures for the tour's "Your report" chapter: two candidates who
// both passed every visible test on TDV-4412.
//
// `report` is shaped like the recruiter report payload so the real
// CodingSectionPanel renders it unchanged (see selectCodingReport in
// report-detail/utils/codingReport.js). `interview` is shaped like the
// adaptive section slice AdaptiveSectionPanel reads (snapshot v6).
//
// The candidates are fictional; every field maps to something the backend
// actually produces. There is deliberately no hire/no-hire verdict — the
// product does not issue one.

import { A1_FULL, A1_THIN, A2, NUDGE_1, Q1, Q2, Q2_SCENARIO, Q3 } from './interviewScript';

const TASK_LABELS = ['state-machines', 'idempotency', 'event-ordering', 'sqlite', 'debugging', 'tickr'];

function priya(role) {
  return {
    id: 'priya',
    name: 'Priya Raman',
    email: 'priya.raman@example.com',
    overall: 86,
    sections: [
      { key: 'coding', label: 'Coding task', percent: 88, points: 60 },
      { key: 'interview', label: 'Follow-up interview', percent: 81, points: 40 },
    ],
    row: {
      visible: '6/6',
      hidden: '10/10',
      coding: 88,
      interview: 81,
      aiPattern: 'Strategic',
      review: 'clear',
    },
    report: {
      top_insight:
        'Reproduced the bug before changing code, used the assistant for a first draft, then rewrote it after finding the restart requirement in the product notes. All hidden tests pass.',
      coding_analytics: {
        report_ready: true,
        status: 'completed',
        sessions: [{ id: 'demo-session-priya' }],
        detail: {
          overall_score: 88,
          ai_access_level: 'full',
          review_policy: { review_status: 'clear', rank_eligible: true, reasons: [] },
          task_labels: TASK_LABELS,
          dimensions: {
            task_completion: {
              score: 96,
              signal: 'green',
              evaluated: true,
              summary:
                'All 6 visible and 10 hidden tests pass, including the restart, duplicate-delivery and same-second ordering cases. Both DECISIONS.md answers name a concrete trade-off.',
              criteria: { hidden_tests: '10/10', hidden_pct: 100 },
            },
            design_quality: {
              score: 84,
              signal: 'green',
              evaluated: true,
              summary:
                'Put state in the tables the schema already provides (alert_state, symbol_watermarks, processed_events) and left the process_tick signature and notifier boundary intact. The transaction boundary is implicit.',
            },
            problem_solving_process: {
              score: 90,
              signal: 'green',
              evaluated: true,
              summary:
                'Reproduced the bug with tools/replay.py before editing, read PRODUCT_NOTES.md and schema.sql after the first green run, and re-ran the replay to confirm 4 notifications.',
            },
            ai_collaboration: {
              score: 82,
              signal: 'green',
              evaluated: true,
              summary:
                'One focused prompt that stated the constraint (keep the signature). Applied the suggestion, then rewrote 3 of its 4 blocks after checking it against the product notes. Ran tests after every AI-assisted change.',
            },
          },
          behavioral_evidence: [
            { dimension: 'problem_solving_process', observation: 'Ran tools/replay.py before editing any file and reproduced the 30 notifications from the ticket.' },
            { dimension: 'ai_collaboration', observation: 'Opened docs/PRODUCT_NOTES.md two minutes after the visible tests went green, then schema.sql.' },
            { dimension: 'design_quality', observation: "Replaced the assistant's in-memory dictionaries with reads and writes to alert_state and symbol_watermarks." },
            { dimension: 'ai_collaboration', observation: 'Ran the test suite after each of three AI-assisted edits.' },
            { dimension: 'task_completion', observation: 'Orders ticks by (timestamp, seq) rather than timestamp alone, matching the feed contract.' },
          ],
          session_timeline: [
            {
              order: 1, label: 'Orientation', activity_type: 'planning', duration_seconds: 372, event_count: 41,
              time_range: { start: '2026-09-11T14:02:00Z' },
              facts: ['Read TICKET.md, README.md and app/engine.py', 'Ran tools/replay.py: 30 notifications'],
            },
            {
              order: 2, label: 'AI-assisted first fix', activity_type: 'ai_use', duration_seconds: 540, event_count: 63,
              time_range: { start: '2026-09-11T14:08:12Z' },
              facts: ['Applied the suggested change to app/engine.py', 'Visible tests: 6 passed'],
              ai_prompt_excerpts: ['process_tick in app/engine.py fires on every tick while the price stays past the threshold… Don\'t change the signature.'],
            },
            {
              order: 3, label: 'Reading the requirements', activity_type: 'debugging', duration_seconds: 305, event_count: 22,
              time_range: { start: '2026-09-11T14:17:12Z' },
              facts: ['Opened docs/PRODUCT_NOTES.md and schema.sql', 'Found the restart and (timestamp, seq) requirements'],
            },
            {
              order: 4, label: 'Rewrite with durable state', activity_type: 'coding', duration_seconds: 1490, event_count: 188,
              time_range: { start: '2026-09-11T14:22:17Z' },
              facts: ['Modified 3 of 4 AI-written blocks', 'Moved state into alert_state and symbol_watermarks'],
            },
            {
              order: 5, label: 'Verification', activity_type: 'testing', duration_seconds: 610, event_count: 57,
              time_range: { start: '2026-09-11T14:47:07Z' },
              facts: ['Replay: 4 notifications', 'Visible tests: 6 passed', 'Filled in DECISIONS.md'],
            },
          ],
          growth_edges: [
            {
              moment: 'Malformed ticks are logged and skipped, but nothing counts them.',
              why: 'A silent parse-failure rate is how a feed outage goes unnoticed in production.',
              alternative: 'Emit a counter per rejection reason and alert on the rate.',
            },
          ],
          interview_probes: [
            'The state write and the notification happen in separate statements. What happens if the process dies between them?',
            'How would you test the restart behaviour without reloading the module?',
          ],
          proctoring_signals: {
            criteria: {
              tab_switches: { signal: 'green', detail: '2 switches, both under 10 seconds.' },
              external_paste: { signal: 'green' },
              inactivity: { signal: 'green' },
            },
          },
          authorship_metrics: { independent_authorship_ratio_net: 0.71 },
        },
      },
    },
    interview: {
      status: 'scored',
      snapshot_version: 6,
      scoring_state: 'scored',
      summary:
        'Explained the restart case precisely once asked for specifics, and read the 2am log correctly, including the crash in feed_consumer. Needed one prompt on the first question.',
      interview_context: { seniority: 'new_grad', role_title: role, preset: 'coding_task_followup' },
      answered_count: 3,
      total_questions: 3,
      questions_nudged: 1,
      total_seconds: 552,
      competencies: [
        {
          key: 'state_management', score: 4, max_score: 4,
          rationales: ['Traced the restart path through alert_state and named the duplicate-after-deploy failure of the in-memory version.'],
          evidence: ["With the assistant's dict, the restart empties it, the first tick looks like a fresh crossing"],
        },
        {
          key: 'failure_handling', score: 3, max_score: 4,
          rationales: ['Identified the unguarded json.loads as a worker crash. Chose log-and-skip with a reasonable justification, but proposed no metric.'],
          evidence: ['the consumer calls json.loads with no guard, so that exception takes the worker down'],
        },
        {
          key: 'implementation_reasoning', score: 3, max_score: 4,
          rationales: ['Told a deliberate stale-tick drop apart from an error, and named a concrete threshold for revisiting the bad-input decision.'],
          evidence: ["seq 2230 is behind the watermark, so it's dropped on purpose"],
        },
      ],
      transcript: [
        {
          order: 1, question: Q1, answer: `${A1_THIN} [follow-up] ${A1_FULL}`, answered: true,
          nudges: [NUDGE_1], acknowledgements: [], competency: 'state_management',
          score: 4, max_score: 4, response_seconds: 148,
          evidence: ['a price above 190 isn\'t a new crossing and nothing fires'],
        },
        {
          order: 2, question: Q2, answer: A2, answered: true, nudges: [], acknowledgements: [],
          competency: 'failure_handling', score: 3, max_score: 4, response_seconds: 171,
          scenario: Q2_SCENARIO,
        },
        {
          order: 3, question: Q3, answered: true, nudges: [], acknowledgements: [],
          answer: "If parse failures went above a few a minute, or if we ever needed to replay them. Then I'd write them to a dead-letter table with the raw line and reprocess after the fix.",
          competency: 'implementation_reasoning', score: 3, max_score: 4, response_seconds: 96,
        },
      ],
    },
  };
}

function jordan(role) {
  return {
    id: 'jordan',
    name: 'Jordan Kim',
    email: 'jordan.kim@example.com',
    overall: 44,
    sections: [
      { key: 'coding', label: 'Coding task', percent: 41, points: 60 },
      { key: 'interview', label: 'Follow-up interview', percent: 38, points: 40 },
    ],
    row: {
      visible: '6/6',
      hidden: '6/10',
      coding: 41,
      interview: 38,
      aiPattern: 'Over-reliant',
      review: 'requires_human_review',
    },
    report: {
      top_insight:
        "Accepted the assistant's in-memory fix without changes and submitted once the visible tests passed. The fix breaks after a worker restart, which the product notes require it to survive.",
      coding_analytics: {
        report_ready: true,
        status: 'completed',
        sessions: [{ id: 'demo-session-jordan' }],
        detail: {
          overall_score: 41,
          ai_access_level: 'full',
          review_policy: {
            review_status: 'requires_human_review',
            rank_eligible: true,
            reasons: [
              'verification:accepted_assistant_code_without_changes_or_further_testing',
              'completion:core_rubric_criteria_not_met',
            ],
          },
          task_labels: TASK_LABELS,
          dimensions: {
            task_completion: {
              score: 48,
              signal: 'yellow',
              evaluated: true,
              summary:
                'All 6 visible tests pass; 6 of 10 hidden tests pass. Fails both restart tests, same-second ordering, and the already-satisfied-condition case.',
              criteria: { hidden_tests: '6/10', hidden_pct: 60 },
            },
            design_quality: {
              score: 52,
              signal: 'yellow',
              evaluated: true,
              summary: 'Added module-level dictionaries to engine.py. The durable-state tables in schema.sql are unused.',
            },
            problem_solving_process: {
              score: 34,
              signal: 'red',
              evaluated: true,
              summary:
                'Did not run tools/replay.py. Submitted 3 minutes after the first green test run; PRODUCT_NOTES.md was never opened.',
            },
            ai_collaboration: {
              score: 30,
              signal: 'red',
              evaluated: true,
              summary:
                "Pasted the ticket into the assistant and accepted its code verbatim. No follow-up prompts, no edits to the AI's code, one test run.",
            },
          },
          behavioral_evidence: [
            { dimension: 'ai_collaboration', observation: 'Pasted the full ticket text into the assistant 4 minutes into the session.' },
            { dimension: 'ai_collaboration', observation: 'Applied the suggested code without modification.' },
            { dimension: 'problem_solving_process', observation: 'Never opened docs/PRODUCT_NOTES.md or schema.sql.' },
            { dimension: 'problem_solving_process', observation: 'Submitted 3 minutes after the visible tests passed.' },
          ],
          session_timeline: [
            {
              order: 1, label: 'Orientation', activity_type: 'planning', duration_seconds: 210, event_count: 18,
              time_range: { start: '2026-09-11T10:31:00Z' },
              facts: ['Read TICKET.md'],
            },
            {
              order: 2, label: 'AI-generated fix', activity_type: 'ai_use', duration_seconds: 420, event_count: 29,
              time_range: { start: '2026-09-11T10:34:30Z' },
              facts: ['Applied the suggested change verbatim', 'Visible tests: 6 passed'],
              ai_prompt_excerpts: ['[pasted TICKET.md] fix this'],
            },
            {
              order: 3, label: 'Submission', activity_type: 'testing', duration_seconds: 180, event_count: 7,
              time_range: { start: '2026-09-11T10:41:30Z' },
              facts: ['Submitted with 58 minutes remaining'],
            },
          ],
          growth_edges: [
            {
              moment: 'Treated a green visible suite as done.',
              why: "The product notes describe restart and ordering requirements the visible tests don't cover.",
              alternative: 'Read the linked notes and replay the recorded feed before submitting.',
            },
          ],
          interview_probes: [
            'Walk me through what your engine does after a deploy restarts the worker mid-breach.',
            'Why compare timestamps with <= rather than using seq?',
          ],
          proctoring_signals: {
            criteria: {
              tab_switches: { signal: 'yellow', detail: '9 switches away from the assessment, 6 of them longer than 30 seconds.' },
              external_paste: { signal: 'green' },
              inactivity: { signal: 'green' },
            },
          },
          authorship_metrics: { independent_authorship_ratio_net: 0.12 },
        },
      },
    },
    interview: {
      status: 'scored',
      snapshot_version: 6,
      scoring_state: 'scored',
      summary:
        'Could not explain how the submitted fix behaves after a restart, and did not spot the crash in the worker logs. Needed prompting on 2 of 3 questions.',
      interview_context: { seniority: 'new_grad', role_title: role, preset: 'coding_task_followup' },
      answered_count: 3,
      total_questions: 3,
      questions_nudged: 2,
      total_seconds: 401,
      competencies: [
        {
          key: 'state_management', score: 1, max_score: 4,
          rationales: ['Did not connect the module-level dictionaries to the restart requirement, even after a follow-up.'],
          evidence: ["I think it would check the condition again. I'd have to test it."],
        },
        {
          key: 'failure_handling', score: 2, max_score: 4,
          rationales: ['Recognised the parse error but not that it stops the worker.'],
          evidence: ['that tick is broken so it gets skipped'],
        },
        {
          key: 'implementation_reasoning', score: 1, max_score: 4,
          rationales: ['Could not say why the stale tick was rejected.'],
          evidence: ['not sure'],
        },
      ],
      transcript: [
        {
          order: 1,
          question: "You kept alert state in module-level dictionaries. What happens to alert #4412 if the worker restarts halfway through a sustained breach?",
          answer: "The dictionaries reset, but the alert already fired so it should be fine. [follow-up] I think it would check the condition again. I'd have to test it.",
          answered: true,
          nudges: ['After the restart the dictionary is empty and the next tick is still above 190. What does your engine do with it?'],
          acknowledgements: [], competency: 'state_management', score: 1, max_score: 4, response_seconds: 122,
        },
        {
          order: 2, question: Q2.replace("That's the failure mode. Different angle: it", 'It'), answered: true,
          answer: 'That tick is broken so it gets skipped, and the other ones look normal.',
          nudges: [], acknowledgements: [], competency: 'failure_handling', score: 2, max_score: 4, response_seconds: 88,
          scenario: Q2_SCENARIO,
        },
        {
          order: 3, question: 'Why was tick mp-nvda-2230 rejected?', answered: true,
          answer: 'Not sure. [follow-up] Maybe because it was already processed?',
          nudges: ['Look at its seq and the one accepted just before it. What does that tell you?'],
          acknowledgements: [], competency: 'implementation_reasoning', score: 1, max_score: 4, response_seconds: 64,
        },
      ],
    },
  };
}

export function buildCandidates(role) {
  return [priya(role), jordan(role)];
}
