import { cn } from '../../../../../lib/utils';
import { Skeleton } from '../../../../../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../../components/ui/table';
import { PanelBlock } from '../SectionPanel';
import { useAdaptiveSectionReport } from '../../hooks/useAdaptiveSectionReport';
import {
  buildExchange,
  describeCaps,
  formatCompetencyLabel,
  formatDuration,
  formatPercent,
  formatScoreValue,
  getRatioTone,
  joinRationales,
} from '../../utils/adaptiveReport';

// Recruiter-facing names for the values the engine stores. `new_grad` is
// "Early career" on the ladder; `intern` is an alias for it and can still
// appear on older snapshots.
const SENIORITY_LABELS = {
  intern: 'Early career',
  new_grad: 'Early career',
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
  staff: 'Staff',
  principal: 'Principal',
};

const PRESET_LABELS = {
  balanced_technical: 'Balanced technical',
  coding_task_followup: 'Coding task follow-up',
  role_specific: 'Role specific',
  system_design_path: 'System design',
  architecture_deep_dive: 'Architecture deep dive',
};

/**
 * One tile per competency the run actually assessed. The engine targets a
 * different subset each time, so the count is dynamic — a fixed row of three
 * would misrepresent most runs.
 */
function CompetencyTiles({ competencies }) {
  if (!competencies.length) return null;

  return (
    <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-3">
      {competencies.map(competency => {
        const tone = getRatioTone(competency.score, competency.max_score);
        return (
          <div
            key={competency.key}
            className="rounded-[10px] border border-border-subtle bg-surface-hover px-[12px] py-[10px]"
          >
            <p className="flex items-baseline gap-[3px]">
              <span className={cn('text-[20px] font-bold leading-none', tone.text)}>
                {formatScoreValue(competency.score)}
              </span>
              {/* The section header reports out of 100 while these are rubric
                  levels out of 4. Showing the percentage too means a recruiter
                  doesn't have to reconcile two scales in their head. */}
              <span className="text-[12px] font-medium text-text-muted">
                /{formatScoreValue(competency.max_score)}
              </span>
              {formatPercent(competency.score, competency.max_score) && (
                <span className="ml-[2px] text-[11px] font-medium text-text-faint">
                  ({formatPercent(competency.score, competency.max_score)})
                </span>
              )}
            </p>
            <p className="mt-[5px] text-[12px] leading-[16px] text-text-secondary">
              {formatCompetencyLabel(competency.key)}
            </p>
            {competency.caps_applied?.length > 0 && (
              <p className="mt-[4px] text-[11px] leading-[15px] text-warning">
                {describeCaps(competency.caps_applied)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Criterion table — rows are the competencies the engine scored. */
function CompetencyTable({ competencies }) {
  if (!competencies.length) return null;

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-subtle">
      <Table>
        <TableHeader>
          <TableRow className="border-b-2 border-b-[var(--color-assessment-accent)] bg-warning-bg hover:bg-warning-bg">
            <TableHead className="w-[150px] px-[12px] text-[13px]">Competency</TableHead>
            <TableHead className="w-[70px] px-[12px] text-[13px]">Score</TableHead>
            <TableHead className="px-[12px] text-[13px]">Evaluator note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {competencies.map(competency => {
            const tone = getRatioTone(competency.score, competency.max_score);
            return (
              <TableRow
                key={competency.key}
                className="border-t border-border-subtle align-top hover:bg-transparent"
              >
                <TableCell className="h-auto px-[12px] py-[11px] text-[13px] font-semibold text-text-primary">
                  {formatCompetencyLabel(competency.key)}
                </TableCell>
                <TableCell className={cn('h-auto px-[12px] py-[11px] text-[13px] font-bold', tone.text)}>
                  {formatScoreValue(competency.score)}/{formatScoreValue(competency.max_score)}
                </TableCell>
                <TableCell className="h-auto px-[12px] py-[11px] text-[12px] leading-[17px] text-text-secondary">
                  {joinRationales(competency.rationales) || '—'}
                  {competency.caps_applied?.length > 0 && (
                    <span className="mt-[5px] block text-[11px] font-medium text-warning">
                      {describeCaps(competency.caps_applied)}
                    </span>
                  )}
                  {/* The scorer cites the candidate's own words for each level
                      it awards; showing them makes the score auditable. */}
                  {competency.evidence?.length > 0 && (
                    <span className="mt-[6px] block border-l-2 border-border-default pl-[8px] text-[11px] italic leading-[16px] text-text-muted">
                      {competency.evidence.map((quote, i) => (
                        <span key={i} className="block">&ldquo;{quote}&rdquo;</span>
                      ))}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * The side panel the candidate was reading when they answered.
 *
 * Without it the transcript reads "Given those logs, what would you check
 * first?" with no logs anywhere, and the answer cannot be judged. Collapsed by
 * default so it does not crowd the exchange.
 */
function ScenarioShown({ scenario }) {
  if (!scenario?.sections?.length) return null;

  return (
    <details className="mt-[7px] rounded-[8px] border border-border-subtle bg-surface-hover px-[10px] py-[7px]">
      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">
        Shown to candidate{scenario.title ? `: ${scenario.title}` : ''}
      </summary>
      <div className="mt-[8px] flex flex-col gap-[10px]">
        {scenario.sections.map((section, i) => (
          <div key={i}>
            {section.label && (
              <p className="mb-[3px] text-[11px] font-medium text-text-faint">{section.label}</p>
            )}
            {section.body && (
              <p className="whitespace-pre-line text-[12px] leading-[17px] text-text-secondary">
                {section.body}
              </p>
            )}
            {section.lines?.length > 0 && (
              <pre className="overflow-x-auto rounded-[6px] bg-surface px-[8px] py-[6px] text-[11px] leading-[16px] text-text-secondary">
                {section.lines.join('\n')}
              </pre>
            )}
            {section.stats?.length > 0 && (
              <div className="flex flex-wrap gap-[10px]">
                {section.stats.map((stat, j) => (
                  <span key={j} className="text-[11px] text-text-secondary">
                    <span className="text-text-faint">{stat.label}:</span> {stat.value}
                  </span>
                ))}
              </div>
            )}
            {section.messages?.length > 0 && (
              <div className="flex flex-col gap-[3px]">
                {section.messages.map((message, j) => (
                  <p key={j} className="text-[12px] leading-[17px] text-text-secondary">
                    <span className="font-semibold">{message.author}:</span> {message.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

/** Question, answer, and the evidence the scorer cited for it. */
function Transcript({ transcript, snapshotVersion }) {
  if (!transcript.length) return null;

  return (
    <ol className="space-y-[18px]">
      {transcript.map((entry, entryIndex) => {
        const tone = getRatioTone(entry.score, entry.max_score);
        // The whole exchange — answer turns with the interviewer's prompts in
        // their real positions, including the prompts that never got a reply.
        // See `buildExchange`: interleaving inside the answer-turn loop could
        // only ever show `turns - 1` nudges, so an ignored or final prompt was
        // counted by the badge and then never rendered.
        // `snapshotVersion` decides whether `nudges` is probes-only. Snapshots
        // below v5 have acknowledgements mixed in, and rendering those as
        // unreplied prompts told the recruiter a 4/4 answer "Needed a prompt".
        const exchange = buildExchange(entry, snapshotVersion);
        const hasAnswerTurn = exchange.some(item => item.kind === 'answer');
        // Only nudges we can actually attribute to prompting. On a pre-split
        // snapshot the unattributable ones are excluded rather than guessed.
        const nudgeCount = exchange.filter(item => item.kind === 'nudge' && item.counts).length;
        return (
          // `order` is nullable in the snapshot and question text can be empty,
          // so the old `order-question` key was not guaranteed unique on a
          // degenerate run. The index is, and the list is never reordered.
          <li key={`${entry.order ?? 'n'}-${entryIndex}`}>
            <div className="flex flex-wrap items-baseline gap-x-[8px]">
              <p className="text-[13px] font-bold leading-[18px] text-text-primary">
                Interviewer: {entry.question}
              </p>
            </div>

            <ScenarioShown scenario={entry.scenario} />

            {/* The stored answer concatenates the candidate's initial reply with
                any follow-up reply. `buildExchange` splits it back apart and
                places the interviewer's prompts between the turns, so the
                exchange reads in the order it actually happened instead of
                looking like an unprompted topic change mid-answer — and it
                emits the prompts that outnumber the turns rather than dropping
                them on the floor the way the old inline interleave did. */}
            {exchange.map((item, index) => (
              item.kind === 'nudge' ? (
                <div key={index} className="mt-[7px]">
                  <p className="text-[12px] font-semibold leading-[18px] text-text-primary">
                    Interviewer (follow-up): {item.text}
                  </p>
                  {/* A prompt with no answer turn behind it is the evidence for
                      the "Needed a prompt" badge, and the recruiter has to be
                      able to see that the candidate never took it. Unlabelled it
                      would read as a prompt that was answered, which is the
                      opposite signal — and unrendered (the old behaviour) it
                      left the badge asserting something with nothing under it. */}
                  {/* `replied === null` means UNKNOWN, not "no": on a snapshot
                      written before acknowledgements were split out of `nudges`,
                      an unanswered probe and a piece of praise are
                      indistinguishable. Asserting "no reply" there put a warning
                      under a 4/4 answer whose only prompt was congratulation, so
                      the unknown case says nothing rather than guessing wrong. */}
                  {item.replied === false && (
                    <p className="mt-[3px] text-[11px] font-medium text-warning">
                      No reply to this prompt
                    </p>
                  )}
                </div>
              ) : (
                <p
                  key={index}
                  className="mt-[7px] border-l-2 border-border-default bg-surface-hover px-[10px] py-[7px] text-[12px] italic leading-[18px] text-text-secondary"
                >
                  {item.text}
                </p>
              )
            ))}

            {/* Keyed off what actually rendered, not off `entry.answered`. The
                two disagree in one direction: `answered` is true whenever
                `answer_text` has any non-whitespace, but the text can still
                split to nothing (an answer that is only the `[follow-up]`
                marker), and that case must not render as a blank gap. It is also
                not "Not answered." — the candidate did submit — so it says what
                is true, that the text is missing. */}
            {!hasAnswerTurn && (
              <p className="mt-[7px] text-[12px] italic leading-[18px] text-text-muted">
                {entry.answered ? 'Answer text was not captured.' : 'Not answered.'}
              </p>
            )}

            {/* Interviewer remarks that asked for nothing back — the engine issues
                these BECAUSE the answer was strong, and the candidate heard them.
                They live outside `nudges` so nothing badges them as prompting,
                but they are shown: an acknowledgement used to be counted against
                the candidate and never rendered, so the recruiter saw the penalty
                and not the sentence that caused it. */}
            {entry.acknowledgements?.map((remark, index) => (
              <p key={`ack-${index}`} className="mt-[7px] text-[12px] font-semibold leading-[18px] text-text-primary">
                Interviewer: {remark}
              </p>
            ))}

            <div className="mt-[7px] flex flex-wrap items-center gap-[6px]">
              {entry.competency && (
                <span className="inline-flex h-[22px] items-center rounded-[6px] border border-border-default px-[8px] text-[11px] font-medium text-text-secondary">
                  {formatCompetencyLabel(entry.competency)}
                </span>
              )}
              {/* `Number.isFinite(Number(entry.score))` alone is NOT enough: the
                  backend writes `"score": null` for a question the scorer returned
                  nothing usable for, and `Number(null)` is 0 — finite — so the
                  guard passed and `formatScoreValue` printed "0" instead of the
                  em-dash it falls back to for non-finite input. An unscored answer
                  rendered as a bold 0/0 directly under a banner saying it could not
                  be scored, and an unanswered one rendered 0/0 beside "Not
                  answered." Null must be rejected before it is coerced. */}
              {entry.score === null || entry.score === undefined ? (
                /* Answered but ungraded is a real state the recruiter has to be
                   able to see per-question — the run-level "N answers could not be
                   scored" banner cannot say WHICH. Unanswered questions already
                   render "Not answered." below, so they get no second label. */
                entry.answered && (
                  <span className="text-[11px] font-medium text-text-muted">Not scored</span>
                )
              ) : Number.isFinite(Number(entry.score)) && (
                <span className={cn('text-[11px] font-bold', tone.text)}>
                  {formatScoreValue(entry.score)}/{formatScoreValue(entry.max_score)}
                </span>
              )}
              {entry.response_mode === 'voice' && (
                <span className="inline-flex h-[22px] items-center rounded-[6px] border border-border-default px-[8px] text-[11px] font-medium text-text-muted">
                  Spoken
                </span>
              )}
              {/* Counted off the exchange rather than off `entry.nudges` so the
                  badge can never claim more prompting than the transcript above
                  it shows. Keeping the two independent is how this drifted in
                  the first place: the badge counted every nudge, the transcript
                  could only render `turns - 1` of them, and nothing made the
                  discrepancy visible. Acknowledgements are excluded because they
                  are not in `nudges` at all — see the backend split. */}
              {nudgeCount > 0 && (
                <span className="inline-flex h-[22px] items-center rounded-[6px] bg-warning-bg px-[8px] text-[11px] font-medium text-warning">
                  {nudgeCount === 1 ? 'Needed a prompt' : `${nudgeCount} prompts`}
                </span>
              )}
              {formatDuration(entry.response_seconds) && (
                <span className="text-[11px] text-text-faint">
                  {formatDuration(entry.response_seconds)}
                </span>
              )}
              {entry.caps_applied?.length > 0 && (
                <span className="text-[11px] font-medium text-warning">
                  {describeCaps(entry.caps_applied)}
                </span>
              )}
            </div>

            {entry.rationale && (
              <p className="mt-[5px] text-[12px] leading-[17px] text-text-secondary">
                {entry.rationale}
              </p>
            )}

            {/* The authored requirement checklist the level was computed from —
                what a disputed 2/4 actually needs. `not_asked` items are ones the
                interviewer never gave an opening for; they neither cost nor
                certify. */}
            {entry.requirements?.length > 0 && (
              <ul className="mt-[6px] space-y-[2px]" aria-label="Requirement checklist">
                {entry.requirements.map((item, i) => {
                  const met = item.verdict === 'met';
                  const notAsked = item.verdict === 'not_asked';
                  return (
                    <li
                      key={i}
                      className={
                        'text-[11px] leading-[16px] ' + (met ? 'text-text-secondary' : 'text-text-muted')
                      }
                    >
                      <span aria-hidden="true" className="mr-[4px] font-mono">
                        {met ? '✓' : notAsked ? '–' : '✗'}
                      </span>
                      <span className="sr-only">{met ? 'Met: ' : notAsked ? 'Not asked: ' : 'Not met: '}</span>
                      {item.requirement}
                    </li>
                  );
                })}
              </ul>
            )}
            {entry.safety_blocked && (
              <p className="mt-[5px] text-[11px] leading-[16px] text-text-muted">
                Withheld from scoring: the AI provider refused to process this answer&rsquo;s content.
              </p>
            )}

            {entry.evidence?.length > 0 && (
              <div className="mt-[5px] border-l-2 border-border-default pl-[8px]">
                {entry.evidence.map((quote, i) => (
                  <p key={i} className="text-[11px] italic leading-[16px] text-text-muted">
                    &ldquo;{quote}&rdquo;
                  </p>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function AdaptiveSectionPanel({ section, report }) {
  const { data, loading, error } = useAdaptiveSectionReport(
    report?.assessment_instance_id,
    section?.section_id,
  );

  if (loading) {
    return (
      <PanelBlock>
        <Skeleton className="h-[14px] w-full" />
        <Skeleton className="mt-[8px] h-[14px] w-3/4" />
        <Skeleton className="mt-[20px] h-[64px] w-full" />
      </PanelBlock>
    );
  }

  if (error) {
    return (
      <PanelBlock>
        <div className="rounded-[10px] border border-error-border bg-error-bg px-[12px] py-[9px]">
          <p className="text-[12px] leading-[17px] text-error">{error}</p>
        </div>
      </PanelBlock>
    );
  }

  const competencies = data?.competencies || [];
  const transcript = data?.transcript || [];

  // Returning null here rendered an empty drawer with nothing but a title, which
  // reads as a broken panel rather than an absent interview.
  if (!data) {
    return (
      <PanelBlock>
        <p className="text-[13px] leading-[20px] text-text-muted">
          No interview data is available for this section.
        </p>
      </PanelBlock>
    );
  }

  // Runs scored before snapshots existed carry only a score and a summary.
  if (data.status === 'unavailable') {
    return (
      <PanelBlock>
        {data.summary && (
          <p className="text-[13px] leading-[20px] text-text-secondary">{data.summary}</p>
        )}
        <p className="mt-[12px] text-[12px] leading-[17px] text-text-muted">
          The detailed interview breakdown was not captured for this run.
        </p>
      </PanelBlock>
    );
  }

  const answeredCount = data.answered_count ?? transcript.filter(entry => entry.answered).length;
  const totalQuestions = data.total_questions ?? transcript.length;
  // A run whose grading failed outright reaches this panel with a full
  // transcript and `score: null` on every entry — previously it wrote no
  // snapshot at all and the panel showed the "unavailable" stub instead. The
  // transcript itself is still worth reading (the questions were asked and the
  // candidate answered them), but a page of "Not scored" chips with no
  // explanation reads as a broken report rather than a failed grading pass, so
  // say it once at the top. `unscored_count` covers the partial case; this is
  // only for a run where nothing scored and that count is absent, which is what
  // a grading failure looks like — its `summary_json` never gets written.
  const scoredCount = transcript.filter(
    entry => entry.score !== null && entry.score !== undefined && Number.isFinite(Number(entry.score)),
  ).length;
  // ⚠️ `scoring_state` FIRST, transcript shape only as the fallback.
  //
  // Inferring from the transcript alone cannot tell the two zero-score runs
  // apart, because they look identical here: full transcript, every
  // `entry.score` null, `unscored_count` absent.
  //
  //   * GRADING FAILED — the platform could not score answers the candidate
  //     gave. `scoring_state: "not_scored"`, ItemAttempt is GRADING_FAILED.
  //   * NO ANSWERS — the candidate was asked and typed nothing.
  //     `scoring_state: "no_answers"`, ItemAttempt is GRADED with an earned 0.
  //
  // Reporting the second as the first tells a hiring manager the system broke
  // when in fact the candidate did not engage — it excuses the zero. That is
  // precisely why `snapshot_version` 6 added `scoring_state`
  // (`assessments/services/adaptive_interview_runtime.py::_build_snapshot`);
  // it was written on the backend and never read here.
  //
  // Snapshots below v6 have no `scoring_state`, and v1-v5 were only ever
  // written on the scored path, so absence falls through to the old inference.
  const noAnswersGiven = data.scoring_state === 'no_answers';
  const nothingScored = data.scoring_state === 'not_scored' || (
    !noAnswersGiven
    && transcript.length > 0
    && scoredCount === 0
    && !data.unscored_count
  );
  // Every block below is conditional, so a scored-but-empty run would otherwise
  // render an entirely blank panel.
  const hasAnyContent = Boolean(data.summary) || competencies.length > 0 || transcript.length > 0;

  if (!hasAnyContent) {
    return (
      <PanelBlock>
        <p className="text-[13px] leading-[20px] text-text-muted">
          This interview has no scored questions yet.
        </p>
      </PanelBlock>
    );
  }

  const context = data.interview_context || {};
  const requiredIntents = data.required_intents || [];
  const contextBits = [
    data.scoring_policy_version && `Scored by ${data.scoring_model || 'the engine'} · policy ${data.scoring_policy_version}`,
    context.seniority && SENIORITY_LABELS[context.seniority] || context.seniority,
    context.role_title || context.role_family,
    context.preset && PRESET_LABELS[context.preset],
  ].filter(Boolean);

  return (
    <>
      {/* What this interview was calibrated to. A score only means something
          next to the level and style it was produced under, and the snapshot is
          the only durable record once the engine run expires. */}
      {contextBits.length > 0 && (
        <PanelBlock>
          <p className="text-[12px] leading-[17px] text-text-muted">
            {contextBits.join(' · ')}
          </p>
        </PanelBlock>
      )}

      {data.summary && (
        <PanelBlock title="AI summary">
          <p className="text-[13px] leading-[20px] text-text-secondary">{data.summary}</p>
        </PanelBlock>
      )}

      {/* Whether the recruiter's own "must ask about" notes were covered. The
          generator echoes the intent it covered so this can be audited; nothing
          read it until now, so a missed request was invisible. */}
      {requiredIntents.length > 0 && (
        <PanelBlock title="Your requested topics">
          <ul className="flex flex-col gap-[6px]">
            {requiredIntents.map((item, i) => (
              <li key={i} className="flex items-start gap-[8px] text-[13px] leading-[19px]">
                <span className={cn('mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full', item.covered ? 'bg-success' : 'bg-warning')} />
                <span className={item.covered ? 'text-text-secondary' : 'text-text-secondary'}>
                  {item.intent}
                  {!item.covered && (
                    <span className="ml-[6px] text-[12px] font-medium text-warning">not covered</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </PanelBlock>
      )}

      {/* Question counts belong to the interview, not to the competency block —
          nesting them there hid them whenever competencies were missing. */}
      {totalQuestions > 0 && (
        <PanelBlock>
          <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[4px] text-[12px] text-text-muted">
            <span>{answeredCount} of {totalQuestions} questions answered</span>
            {/* Independence. "3/3 unprompted" and "3/3, nudged every time" are
                very different candidates and read identically without this. */}
            {Number.isFinite(Number(data.questions_nudged)) && (
              <span className={cn(data.questions_nudged > 0 && 'text-warning')}>
                {data.questions_nudged === 0
                  ? 'Answered without prompting'
                  : `Needed prompting on ${data.questions_nudged} of ${totalQuestions}`}
              </span>
            )}
            {formatDuration(data.total_seconds) && (
              <span>{formatDuration(data.total_seconds)} total</span>
            )}
            {/* Scored on the answered subset only — without this a cut-short
                interview reads exactly like a completed one. */}
            {data.partial && (
              <span className="font-medium text-warning">
                Ended early — scored on answered questions only
              </span>
            )}
            {/* The candidate answered these; the scorer failed to return a usable
                score. Excluded from the denominator so they are not penalised —
                but a competency that was probed and lost must not look like one
                that was never probed. */}
            {data.unscored_count > 0 && (
              <span className="font-medium text-warning">
                {data.unscored_count} answer{data.unscored_count === 1 ? '' : 's'} could not be scored
              </span>
            )}
            {/* Nothing in this interview scored at all — a grading failure, not
                a candidate signal. Without this the transcript below reads as if
                every single answer was judged unusable. */}
            {nothingScored && (
              <span className="font-medium text-warning">
                Grading did not complete — the transcript is shown unscored
              </span>
            )}
            {/* The OTHER zero-score run, and the opposite reading: the interview
                ran, the questions were asked, and the candidate typed nothing.
                That is a real signal about the candidate, so it must not borrow
                the grading-failure wording above — which would hand them an
                excuse the record does not support. Neutral, factual, no verdict. */}
            {noAnswersGiven && (
              <span className="font-medium text-warning">
                No questions were answered
              </span>
            )}
            {/* The score does not rest on the full interview — say so next to the
                number, not in a log. Two different causes set this: answers the
                scorer could not grade, or too little of the planned interview
                reaching a score at all. The specific reason is already stated by
                the banners above and beside this one, so this carries only the
                instruction and stays true for both. */}
            {data.requires_review && (
              <span className="font-medium text-warning">
                Review before relying on this score
              </span>
            )}
            {/* An outage served static fallback questions. Those interviews are
                not comparable to generated ones, and a recruiter comparing two
                candidates has no other way to know. */}
            {data.fallback_question_count > 0 && (
              <span className="font-medium text-warning">
                {data.fallback_question_count} question
                {data.fallback_question_count === 1 ? ' was' : 's were'} served from backup during a
                service outage
              </span>
            )}
          </div>

          {/* Competencies the recruiter configured that did not fit the question
              count. Without this, "never asked" is indistinguishable from
              "asked and scored badly". */}
          {Array.isArray(data.unasked_focus_areas) && data.unasked_focus_areas.length > 0 && (
            <p className="mt-[10px] text-[12px] leading-[17px] text-text-muted">
              Not covered in this interview (more focus areas than questions):{' '}
              {data.unasked_focus_areas.map(formatCompetencyLabel).join(', ')}
            </p>
          )}
        </PanelBlock>
      )}

      {competencies.length > 0 && (
        <PanelBlock title="Competency scores">
          <CompetencyTiles competencies={competencies} />
        </PanelBlock>
      )}

      {competencies.length > 0 && (
        <PanelBlock title="Competency breakdown">
          <CompetencyTable competencies={competencies} />
        </PanelBlock>
      )}

      {transcript.length > 0 && (
        <PanelBlock title="Transcript">
          <Transcript transcript={transcript} snapshotVersion={data.snapshot_version} />
        </PanelBlock>
      )}
    </>
  );
}
