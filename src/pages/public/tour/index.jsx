// ─────────────────────────────────────────────────────────────────────────────
// ProductTourPage — /tour, the link in outbound emails.
//
// A scripted, public walkthrough of one candidate's assessment: the coding
// task in a mock of the real workspace, the follow-up AI interview on the real
// interview screen, and the hiring manager's report rendered by the real
// report panels. No backend calls; every value comes from ./fixtures.
//
// Personalised by ?c=<company>&r=<role>, attributed by ?ref=<prospect id>
// (see tourConfig.js and tourAnalytics.js). Under 768px the coding and
// interview chapters are skipped: the workspace doesn't fit a phone.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { BOOKING_URL, DEFAULT_COMPANY, DEFAULT_ROLE, LIVE_DEMO_SLUG } from './tourConfig';
import { readTourParams } from './tourParams';
import { initTourAnalytics, track } from './tourAnalytics';
import { CHAPTERS, buildPositions, foldChapterView, getChapter } from './tourScript';
import { useBeatPlayer, useMediaQuery } from './tourHooks';
import TourTopBar from './components/TourTopBar';
import NarratorPanel from './components/NarratorPanel';
import Spotlight from './components/Spotlight';
import SignalRail from './components/SignalRail';
import GroundingPanel from './components/GroundingPanel';
import IntroScreen from './chapters/IntroScreen';
import OutroScreen from './chapters/OutroScreen';
import CodingChapter from './chapters/CodingChapter';
import InterviewChapter from './chapters/InterviewChapter';
import ReportChapter from './chapters/ReportChapter';
import FormatsChapter from './chapters/FormatsChapter';

const CHAPTER_SCREENS = {
  task: CodingChapter,
  interview: InterviewChapter,
  report: ReportChapter,
  formats: FormatsChapter,
};

function isTypingTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="slider"]'));
}

export default function ProductTourPage() {
  const { search } = useLocation();
  const params = useMemo(() => readTourParams(search), [search]);
  const role = params.role || DEFAULT_ROLE;
  const companyPhrase = params.company || DEFAULT_COMPANY;
  const companyName = params.company || 'Your company';

  const narrow = useMediaQuery('(max-width: 767px)');
  const positions = useMemo(() => buildPositions(narrow), [narrow]);
  const railChapters = useMemo(
    () => CHAPTERS.filter(chapter => !chapter.screen && !(narrow && chapter.desktopOnly)),
    [narrow],
  );

  const [at, setAt] = useState({ chapterId: 'intro', stepIndex: 0 });
  const [visited, setVisited] = useState(() => new Set(['intro']));
  const stageRef = useRef(null);

  // A position that doesn't exist at this width (a desktop-only chapter on a
  // phone) falls forward to the report.
  let index = positions.findIndex(p => p.chapterId === at.chapterId && p.stepIndex === at.stepIndex);
  if (index === -1) index = positions.findIndex(p => p.chapterId === 'report');
  const position = positions[index];
  const chapter = getChapter(position.chapterId);
  const step = chapter.steps[position.stepIndex];
  const stepKey = `${position.chapterId}:${position.stepIndex}`;

  const { shown, done } = useBeatPlayer(step.beats || [], stepKey);
  const view = useMemo(
    () => foldChapterView(chapter, position.stepIndex, shown),
    [chapter, position.stepIndex, shown],
  );

  const goTo = useCallback((nextIndex) => {
    const target = positions[Math.min(Math.max(nextIndex, 0), positions.length - 1)];
    setAt({ chapterId: target.chapterId, stepIndex: target.stepIndex });
    setVisited(prev => (prev.has(target.chapterId) ? prev : new Set([...prev, target.chapterId])));
  }, [positions]);

  const firstIndexOf = useCallback(
    chapterId => positions.findIndex(p => p.chapterId === chapterId),
    [positions],
  );

  const skipToReport = useCallback(() => {
    track('tour_skip_to_report', { from: position.chapterId });
    goTo(firstIndexOf('report'));
  }, [goTo, firstIndexOf, position.chapterId]);

  const replay = useCallback(() => {
    setVisited(new Set(['intro']));
    goTo(0);
  }, [goTo]);

  // ── analytics ──
  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    initTourAnalytics(params);
    track('tour_opened', { company: params.company || null, role: params.role || null, narrow });
  }, [params, narrow]);

  useEffect(() => {
    track('tour_step_viewed', {
      chapter: position.chapterId,
      step: position.stepId,
      position: index + 1,
      total: positions.length,
    });
    if (position.chapterId === 'outro') track('tour_completed', {});
  }, [position.chapterId, position.stepId, index, positions.length]);

  // ── keyboard ──
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); goTo(index + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(index - 1); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goTo, index]);

  useEffect(() => {
    const previous = document.title;
    document.title = 'TruDev · Product tour';
    return () => { document.title = previous; };
  }, []);

  const Screen = CHAPTER_SCREENS[chapter.id];
  const next = positions[index + 1];
  const nextChapter = next && next.chapterId !== chapter.id ? getChapter(next.chapterId) : null;
  const nextLabel = !next
    ? 'Finish'
    : nextChapter
      ? (nextChapter.id === 'outro' ? 'Finish the tour' : `Next: ${nextChapter.label}`)
      : 'Next';

  let insight = null;
  if (chapter.id === 'task') insight = <SignalRail signals={view.signals} />;
  if (chapter.id === 'interview') insight = <GroundingPanel />;

  return (
    <div className="adaptive-lp flex h-[100dvh] flex-col overflow-hidden">
      <TourTopBar
        chapters={railChapters}
        currentId={chapter.id}
        visitedIds={visited}
        onJump={chapterId => goTo(firstIndexOf(chapterId))}
        bookingUrl={BOOKING_URL}
        onBook={() => track('tour_cta_clicked', { cta: 'book_call', from: chapter.id })}
      />

      {chapter.id === 'intro' && (
        <main className="min-h-0 flex-1">
          <IntroScreen
            companyPhrase={companyPhrase}
            role={role}
            narrow={narrow}
            onStart={() => goTo(index + 1)}
            onSkipToReport={skipToReport}
          />
        </main>
      )}

      {chapter.id === 'outro' && (
        <main className="min-h-0 flex-1">
          <OutroScreen
            role={role}
            bookingUrl={BOOKING_URL}
            liveDemoSlug={LIVE_DEMO_SLUG}
            onCta={cta => track('tour_cta_clicked', { cta, from: 'outro' })}
            onReplay={replay}
          />
        </main>
      )}

      {Screen && (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* First in DOM order on purpose — see NarratorPanel's comment.
              Above the stage on mobile, to its left on desktop, so the reader
              meets the copy before the stage either way. */}
          <NarratorPanel
            chapterNumber={railChapters.findIndex(c => c.id === chapter.id) + 1}
            chapterLabel={chapter.label}
            step={step}
            stepIndex={position.stepIndex}
            stepCount={chapter.steps.length}
            done={done}
            onBack={() => goTo(index - 1)}
            onNext={() => goTo(index + 1)}
            canGoBack={index > 0}
            nextLabel={nextLabel}
            insight={insight}
          />
          {/* Not a <main>: the reused interview screen renders its own. */}
          <div
            ref={stageRef}
            role="region"
            aria-label={chapter.label}
            className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
          >
            <Screen
              view={view}
              stepKey={stepKey}
              company={companyName}
              role={role}
            />
            <Spotlight stageRef={stageRef} target={step.target} stepKey={stepKey} />
          </div>
        </div>
      )}
    </div>
  );
}
