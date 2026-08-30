import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion, useReducedMotion } from 'motion/react';
import LiveChatDemo from './components/LiveChatDemo';
import UseCaseShowcase from './components/UseCaseShowcase';
import {
  Accent, ArrowIcon, Card, Container, DISPLAY, Eyebrow, GhostButton,
  Heading, Lede, MONO, PrimaryButton, Pill, Reveal, Section,
} from './components/primitives';

/**
 * Public product page for the AI Adaptive Interview.
 *
 * Audience is founders, recruiters and hiring managers — people deciding
 * whether to put this in front of their candidates — so the page argues from
 * mechanism (bounded adaptation, fixed blueprint, anchored rubric) rather than
 * adjectives. Dark surface + ember is the candidate-runtime palette, which is
 * what the screenshots will be captured against.
 *
 * Reached from the "See how it works" CTA on the recruiter dashboard's
 * AI Adaptive card, and linkable on its own as a public route.
 */

const NAV_LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#modes', label: 'Five ways to use it' },
  { href: '#fairness', label: 'Fairness' },
  { href: '#coverage', label: 'Coverage' },
  { href: '#report', label: 'What you get' },
];

export default function AdaptiveInterviewLanding() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'AI Adaptive Interview — Trudev';
    return () => { document.title = prevTitle; };
  }, []);

  return (
    <div className="adaptive-lp min-h-screen font-sans antialiased">
      <TopNav />
      <Hero />
      <RoleMarquee />
      <ProblemSection />
      <HowItWorks />
      <ModesSection />
      <FairnessSection />
      <CoverageSection />
      <ReportSection />
      <FaqSection />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   NAV
   ══════════════════════════════════════════════════════════════════ */

function TopNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(10, 9, 8, 0.82)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: `1px solid ${scrolled ? 'var(--lp-line-soft)' : 'transparent'}`,
      }}
    >
      <Container className="flex h-16 items-center gap-6">
        <Link to="/recruiter/dashboard" className="flex items-center gap-2.5">
          <span
            className="grid h-7 w-7 place-items-center rounded-lg text-[12px] font-bold text-[#180C03]"
            style={{ background: 'linear-gradient(135deg, var(--lp-ember-soft), var(--lp-ember))', fontFamily: MONO }}
          >
            T
          </span>
          <span className="font-wordmark text-[14.5px] font-medium text-[var(--lp-fg)]" style={{ letterSpacing: '-0.02em' }}>
            Trudev
          </span>
          <span className="hidden sm:inline text-[11px] text-[var(--lp-fg-faint)]" style={{ fontFamily: MONO }}>
            / adaptive
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[12.5px] font-medium text-[var(--lp-fg-dim)] transition-colors hover:text-[var(--lp-fg)]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <Link
          to="/recruiter/assessments/new"
          className="ml-auto lg:ml-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold text-[#180C03] transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, var(--lp-ember-soft), var(--lp-ember))' }}
        >
          Build an interview
          <ArrowIcon />
        </Link>
      </Container>
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HERO
   ══════════════════════════════════════════════════════════════════ */

function Hero() {
  const reduce = useReducedMotion();

  return (
    <div className="relative overflow-hidden">
      {/* Ambient ground */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="lp-grid-bg absolute inset-0 opacity-60" style={{ maskImage: 'radial-gradient(ellipse 90% 62% at 50% 8%, #000 20%, transparent 78%)', WebkitMaskImage: 'radial-gradient(ellipse 90% 62% at 50% 8%, #000 20%, transparent 78%)' }} />
        <div
          className="lp-aurora absolute -top-[26%] left-[8%] h-[560px] w-[560px] rounded-full blur-[130px]"
          style={{ background: 'radial-gradient(circle, rgba(255,107,0,0.5), transparent 66%)' }}
        />
        <div
          className="lp-aurora absolute -top-[16%] right-[2%] h-[460px] w-[460px] rounded-full blur-[140px]"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.28), transparent 68%)', animationDelay: '-9s' }}
        />
      </div>

      <Container className="relative pt-14 pb-20 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-14">
          <div>
            <Motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px]"
                style={{
                  fontFamily: MONO,
                  color: 'var(--lp-ember-soft)',
                  background: 'rgba(255, 133, 40, 0.09)',
                  border: '1px solid rgba(255, 133, 40, 0.26)',
                }}
              >
                <i className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--lp-ember)', boxShadow: '0 0 10px var(--lp-ember)' }} />
                AI Adaptive Interview — inside every Trudev assessment
              </span>
            </Motion.div>

            <Motion.h1
              className="mt-6 text-[clamp(2.35rem,5.6vw,4.05rem)] leading-[1.02] text-[var(--lp-fg)]"
              style={{ fontFamily: DISPLAY, fontWeight: 800, letterSpacing: '-0.038em' }}
              initial={reduce ? false : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              An interview that <Accent>listens</Accent> before it asks.
            </Motion.h1>

            <Motion.p
              className="mt-6 max-w-[560px] text-[15px] sm:text-[16.5px] leading-[1.68] text-[var(--lp-fg-dim)]"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            >
              A chat-based panel that reads the résumé, the code they just wrote, and whatever
              material you hand it — then runs a real conversation that goes exactly as deep as
              the candidate can go. Same blueprint for everyone. Scored on evidence, not vibes.
            </Motion.p>

            <Motion.div
              className="mt-8 flex flex-wrap items-center gap-3"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link to="/recruiter/assessments/new">
                <PrimaryButton>
                  Add it to your next assessment
                  <ArrowIcon className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </PrimaryButton>
              </Link>
              <a href="#modes">
                <GhostButton>See the five modes</GhostButton>
              </a>
            </Motion.div>

            <Motion.div
              className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2.5"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.34 }}
            >
              {['Bounded adaptation', '11 role families', '5 calibrated levels', 'Full audit trail'].map((t) => (
                <span key={t} className="flex items-center gap-2 text-[11px] text-[var(--lp-fg-faint)]" style={{ fontFamily: MONO }}>
                  <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 text-[var(--lp-ember-soft)]" aria-hidden="true">
                    <path d="M2.5 6.2l2.3 2.3L9.5 3.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t}
                </span>
              ))}
            </Motion.div>
          </div>

          <Motion.div
            initial={reduce ? false : { opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.85, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <LiveChatDemo />
            <p className="mt-3 text-center text-[10.5px]" style={{ fontFamily: MONO, color: 'var(--lp-fg-faint)' }}>
              Real transcript shape. The chips are the engine's own branch decisions.
            </p>
          </Motion.div>
        </div>
      </Container>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ROLE MARQUEE
   ══════════════════════════════════════════════════════════════════ */

const ROLE_FAMILIES = [
  'Backend', 'Frontend', 'Fullstack', 'DevOps', 'Data Engineering',
  'Data Science', 'LLM Engineering', 'AI / ML', 'MLOps', 'Mobile', 'Security',
];

function RoleMarquee() {
  return (
    <div className="lp-marquee-host relative overflow-hidden py-6" style={{ borderTop: '1px solid var(--lp-line-soft)', borderBottom: '1px solid var(--lp-line-soft)' }}>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24"
        style={{ background: 'linear-gradient(to right, var(--lp-ink), transparent)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24"
        style={{ background: 'linear-gradient(to left, var(--lp-ink), transparent)' }}
        aria-hidden="true"
      />
      <div className="lp-marquee flex w-max gap-10">
        {[...ROLE_FAMILIES, ...ROLE_FAMILIES].map((r, i) => (
          <span
            key={`${r}-${i}`}
            className="flex items-center gap-3 whitespace-nowrap text-[12.5px] text-[var(--lp-fg-faint)]"
            style={{ fontFamily: MONO, letterSpacing: '0.04em' }}
          >
            <i className="h-1 w-1 rounded-full" style={{ background: 'var(--lp-ember)' }} />
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PROBLEM
   ══════════════════════════════════════════════════════════════════ */

const PROBLEMS = [
  {
    n: '01',
    title: 'Your question bank leaked last Tuesday.',
    body: 'A fixed list survives about a week in a Discord server. By candidate twelve you are measuring who found the list, not who can do the work.',
  },
  {
    n: '02',
    title: 'The take-home shows the what, never the why.',
    body: 'You get a diff. You do not get whether they could defend a single line of it, or whether a model wrote the whole thing on Sunday night.',
  },
  {
    n: '03',
    title: 'Every panel interviews a little differently.',
    body: 'Two hiring managers, two moods, two private rubrics. Then someone asks you to compare the scores across forty candidates.',
  },
];

function ProblemSection() {
  return (
    <Section rule={false}>
      <Container>
        <Reveal>
          <Eyebrow>The screening gap</Eyebrow>
          <Heading className="mt-4 max-w-[720px]">
            Screening is broken in a very <Accent>specific</Accent> way.
          </Heading>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.08}>
              <Card className="h-full">
                <span className="text-[11px]" style={{ fontFamily: MONO, color: 'var(--lp-fg-faint)', letterSpacing: '0.14em' }}>
                  {p.n}
                </span>
                <h3
                  className="mt-4 text-[17px] leading-[1.28] text-[var(--lp-fg)]"
                  style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '-0.02em' }}
                >
                  {p.title}
                </h3>
                <p className="mt-3 text-[13.5px] leading-[1.65] text-[var(--lp-fg-dim)]">{p.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HOW IT WORKS
   ══════════════════════════════════════════════════════════════════ */

const STEPS = [
  {
    n: '01',
    label: 'Context in',
    title: 'It starts already knowing something.',
    body: 'The résumé, the coding attempt they just submitted, the doc you uploaded, the role family and the seniority band. The panel opens on their work, not on a generic warm-up.',
    tags: ['résumé', 'submission', 'your material', 'role + level'],
    accent: '#FF8528',
  },
  {
    n: '02',
    label: 'Bounded adaptation',
    title: 'The blueprint is fixed. Only the depth moves.',
    body: 'Plain Python reads the last answer and picks a branch — scaffold, seek evidence, or push on the tradeoff. The model never chooses what to test; it only writes the sentence inside the slot it was handed.',
    tags: ['no_prior_answer', 'low_evidence', 'partial_evidence', 'sufficient_evidence'],
    accent: '#38BDF8',
  },
  {
    n: '03',
    label: 'Evidence out',
    title: 'Every score points at the sentence that earned it.',
    body: 'Answers are scored against an anchored 0–4 rubric, level-relative, with the supporting quote attached and the branch decision logged. It lands in the same candidate report as the rest of the assessment.',
    tags: ['0–4 anchored', 'competency scores', 'audit record'],
    accent: '#4ADE80',
  },
];

function HowItWorks() {
  return (
    <Section id="how">
      <Container>
        <Reveal>
          <Eyebrow>How it works</Eyebrow>
          <Heading className="mt-4 max-w-[760px]">
            Adaptive where it helps candidates. <Accent>Fixed</Accent> where it protects them.
          </Heading>
          <Lede className="mt-5 max-w-[620px]">
            Most "AI interviewers" hand the whole conversation to a language model and hope.
            This one does not. The interview plan is decided before anyone joins, and the model
            works inside it.
          </Lede>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <Card accent={s.accent} className="relative h-full overflow-hidden">
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-[60px] opacity-45 transition-opacity duration-500 group-hover:opacity-80"
                  style={{ background: s.accent }}
                  aria-hidden="true"
                />
                <div className="relative">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold"
                      style={{
                        fontFamily: MONO,
                        color: s.accent,
                        background: `color-mix(in srgb, ${s.accent} 13%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${s.accent} 28%, transparent)`,
                      }}
                    >
                      {s.n}
                    </span>
                    <span className="text-[10.5px] uppercase" style={{ fontFamily: MONO, letterSpacing: '0.14em', color: s.accent }}>
                      {s.label}
                    </span>
                  </div>

                  <h3
                    className="mt-5 text-[18px] leading-[1.26] text-[var(--lp-fg)]"
                    style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '-0.022em' }}
                  >
                    {s.title}
                  </h3>
                  <p className="mt-3 text-[13.5px] leading-[1.68] text-[var(--lp-fg-dim)]">{s.body}</p>

                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {s.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md px-2 py-1 text-[10px]"
                        style={{
                          fontFamily: MONO,
                          color: 'var(--lp-fg-faint)',
                          background: 'rgba(255,255,255,0.035)',
                          border: '1px solid var(--lp-line-soft)',
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MODES
   ══════════════════════════════════════════════════════════════════ */

function ModesSection() {
  return (
    <Section id="modes">
      <Container>
        <Reveal>
          <Eyebrow>Five ways to use it</Eyebrow>
          <Heading className="mt-4 max-w-[820px]">
            One panel. Five <Accent>very different</Accent> rounds.
          </Heading>
          <Lede className="mt-5 max-w-[640px]">
            Same engine, same rubric discipline, same report. What changes is what you point it
            at — and you can stack more than one round inside a single assessment.
          </Lede>
        </Reveal>

        <Reveal delay={0.1} className="mt-12">
          <UseCaseShowcase />
        </Reveal>
      </Container>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FAIRNESS
   ══════════════════════════════════════════════════════════════════ */

const INVARIANTS = [
  { t: 'Same competencies, same order', b: 'Question count, sequence and target competency are locked by the blueprint before the first candidate opens the link.' },
  { t: 'Same difficulty band', b: 'A senior candidate and the next senior candidate are graded against the same calibrated band. Adaptation never raises or lowers the bar.' },
  { t: 'Same rubric, same weight', b: 'Every branch of every question still contributes the identical rubric maximum to the final score.' },
  { t: 'No demographic signal, ever', b: 'The branch analysis reads word count and reasoning markers. It does not look at grammar, accent, writing style, typing speed or anything about who the person is.' },
];

function FairnessSection() {
  return (
    <Section id="fairness">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-16 lg:items-start">
          <Reveal>
            <Eyebrow accent="#4ADE80">Defensible by design</Eyebrow>
            <Heading className="mt-4">
              Adaptive, not <Accent color="#4ADE80">arbitrary</Accent>.
            </Heading>
            <Lede className="mt-5">
              The question every serious hiring manager asks second: if the interview changes per
              candidate, how is it fair? Here is the honest mechanism — the LLM does not pick the
              branch. Deterministic Python does, and the constraints it cannot touch are written
              down.
            </Lede>

            <div className="mt-8 flex flex-col gap-3">
              {INVARIANTS.map((inv) => (
                <div key={inv.t} className="flex gap-3.5">
                  <span
                    className="mt-1 grid h-5 w-5 flex-shrink-0 place-items-center rounded-md"
                    style={{ background: 'rgba(74, 222, 128, 0.13)', border: '1px solid rgba(74, 222, 128, 0.3)' }}
                  >
                    <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 text-[#4ADE80]" aria-hidden="true">
                      <path d="M2.5 6.2l2.3 2.3L9.5 3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--lp-fg)]">{inv.t}</p>
                    <p className="mt-1 text-[13px] leading-[1.62] text-[var(--lp-fg-dim)]">{inv.b}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div
              className="overflow-hidden rounded-2xl"
              style={{ background: 'linear-gradient(168deg, #17140F, #100E0D)', border: '1px solid var(--lp-line)' }}
            >
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderBottom: '1px solid var(--lp-line-soft)' }}
              >
                <span className="text-[10.5px]" style={{ fontFamily: MONO, color: 'var(--lp-fg-faint)' }}>
                  adaptation_decision · stored with every question
                </span>
                <Pill accent="#4ADE80">auditable</Pill>
              </div>
              <pre
                className="overflow-x-auto px-4 py-4 text-[11.5px] leading-[1.85]"
                style={{ fontFamily: MONO, color: 'var(--lp-fg-dim)' }}
              >
{`{
  "policy_version": `}<span style={{ color: '#FFA94D' }}>"bounded_adaptation.v1"</span>{`,
  "answer_signal": `}<span style={{ color: '#FBBF24' }}>"low_evidence"</span>{`,
  "question_strategy": `}<span style={{ color: '#38BDF8' }}>"evidence_seeking"</span>{`,
  "source_question_order": `}<span style={{ color: '#A78BFA' }}>2</span>{`,
  "target_competency": `}<span style={{ color: '#4ADE80' }}>"reliability"</span>{`,
  "fixed_constraints": {
    "difficulty_band": `}<span style={{ color: '#4ADE80' }}>"senior"</span>{`,
    "rubric_anchor":   `}<span style={{ color: '#4ADE80' }}>"failure_isolation"</span>{`,
    "scoring_weight":  `}<span style={{ color: '#A78BFA' }}>1.0</span>{`
  }
}`}
              </pre>
              <div className="px-4 pb-4">
                <p className="text-[12px] leading-[1.6] text-[var(--lp-fg-dim)]">
                  Every question keeps its own decision record. When someone asks why a candidate
                  got the question they got, you have an answer — not a shrug.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   COVERAGE
   ══════════════════════════════════════════════════════════════════ */

const LEVELS = [
  { l: 'Intern', d: 'Scoped, concrete, heavily scaffolded' },
  { l: 'Entry level', d: 'Task-local reasoning, honest uncertainty rewarded' },
  { l: 'Junior', d: 'Owns a task; asked what and why, not how the org runs' },
  { l: 'Mid', d: 'Feature ownership, alternatives, operational concerns' },
  { l: 'Senior', d: 'Multi-component systems, reliability boundaries' },
  { l: 'Staff', d: 'Cross-team standards, platform tradeoffs, org risk' },
  { l: 'Principal', d: 'Irreversible decisions, long-horizon direction' },
];

const COVERAGE_STATS = [
  { v: '55', l: 'role × level calibrations' },
  { v: '245', l: 'catalog entry lookups' },
  { v: '0–4', l: 'anchored rubric scale' },
  { v: '100%', l: 'of questions audit-logged' },
];

function CoverageSection() {
  return (
    <Section id="coverage">
      <Container>
        <Reveal>
          <Eyebrow accent="#A78BFA">Coverage</Eyebrow>
          <Heading className="mt-4 max-w-[760px]">
            Calibrated per level, so nobody is graded against <Accent color="#A78BFA">someone else&apos;s</Accent> ladder.
          </Heading>
          <Lede className="mt-5 max-w-[640px]">
            A junior scoring a 3 means &ldquo;strongly meets junior expectations&rdquo;. A principal
            scoring a 3 means &ldquo;strongly meets principal expectations&rdquo;. No band has to clear
            a higher band&apos;s bar to score well.
          </Lede>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Reveal>
            <Card accent="#A78BFA" hover={false} className="h-full">
              <p className="text-[10.5px] uppercase" style={{ fontFamily: MONO, letterSpacing: '0.14em', color: 'var(--lp-fg-faint)' }}>
                Role families
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {ROLE_FAMILIES.map((r) => (
                  <span
                    key={r}
                    className="rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--lp-fg-dim)] transition-colors duration-200 hover:text-[var(--lp-fg)]"
                    style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid var(--lp-line-soft)' }}
                  >
                    {r}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-[12.5px] leading-[1.62] text-[var(--lp-fg-faint)]">
                Each family carries its own competencies — API design and data modelling for
                backend, prompting, RAG and evaluation for LLM engineering, threat modelling and
                incident response for security.
              </p>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card accent="#A78BFA" hover={false} className="h-full">
              <p className="text-[10.5px] uppercase" style={{ fontFamily: MONO, letterSpacing: '0.14em', color: 'var(--lp-fg-faint)' }}>
                Seniority ladder
              </p>
              <div className="mt-4 flex flex-col">
                {LEVELS.map((lv, i) => (
                  <div
                    key={lv.l}
                    className="group/row flex items-baseline gap-4 py-2.5"
                    style={{ borderTop: i === 0 ? 'none' : '1px solid var(--lp-line-soft)' }}
                  >
                    <span
                      className="w-[86px] flex-shrink-0 text-[12.5px] font-semibold text-[var(--lp-fg)]"
                      style={{ fontFamily: DISPLAY }}
                    >
                      {lv.l}
                    </span>
                    <span className="text-[12.5px] leading-[1.5] text-[var(--lp-fg-dim)]">{lv.d}</span>
                    <span
                      className="ml-auto hidden h-1 flex-shrink-0 rounded-full sm:block"
                      style={{
                        width: 12 + i * 9,
                        background: 'linear-gradient(90deg, rgba(167,139,250,0.25), #A78BFA)',
                      }}
                      aria-hidden="true"
                    />
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        </div>

        <Reveal delay={0.14}>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COVERAGE_STATS.map((s) => (
              <div
                key={s.l}
                className="rounded-2xl px-5 py-6 text-center"
                style={{ background: 'rgba(255,255,255,0.022)', border: '1px solid var(--lp-line-soft)' }}
              >
                <p
                  className="text-[30px] leading-none text-[var(--lp-fg)]"
                  style={{ fontFamily: DISPLAY, fontWeight: 800, letterSpacing: '-0.03em' }}
                >
                  {s.v}
                </p>
                <p className="mt-2.5 text-[11px]" style={{ fontFamily: MONO, color: 'var(--lp-fg-faint)' }}>
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WHAT YOU GET BACK
   ══════════════════════════════════════════════════════════════════ */

const COMPETENCIES = [
  { name: 'Reliability', score: 3, note: 'Named the split-brain risk unprompted' },
  { name: 'API design', score: 4, note: 'Versioning tradeoff with a concrete migration' },
  { name: 'Data modelling', score: 2, note: 'Plausible schema, missed the write path' },
  { name: 'Performance', score: 3, note: 'Measured before optimising; cited the benchmark' },
];

const REPORT_POINTS = [
  'Competency scores on the anchored 0–4 scale, level-relative',
  'The full scored transcript, with the quote each score rests on',
  'The adaptation record for every question asked',
  'Rolled into the same candidate report as the coding and MCQ sections',
];

function ReportSection() {
  return (
    <Section id="report">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1fr)] lg:gap-16 lg:items-center">
          <Reveal>
            <Eyebrow accent="#38BDF8">What lands on your desk</Eyebrow>
            <Heading className="mt-4">
              A transcript you can <Accent color="#7DD3FC">actually</Accent> defend in a debrief.
            </Heading>
            <Lede className="mt-5">
              Not a similarity percentage. Not a confidence score with no provenance. A competency
              breakdown where every number points back at a sentence the candidate actually said.
            </Lede>

            <ul className="mt-8 flex flex-col gap-3.5">
              {REPORT_POINTS.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#38BDF8' }} />
                  <span className="text-[13.5px] leading-[1.62] text-[var(--lp-fg-dim)]">{p}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.12}>
            <Card accent="#38BDF8" hover={false}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13.5px] font-semibold text-[var(--lp-fg)]">Adaptive section</p>
                  <p className="mt-1 text-[10.5px]" style={{ fontFamily: MONO, color: 'var(--lp-fg-faint)' }}>
                    backend · senior · 8 questions
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="text-[26px] leading-none text-[var(--lp-fg)]"
                    style={{ fontFamily: DISPLAY, fontWeight: 800, letterSpacing: '-0.03em' }}
                  >
                    76<span className="text-[15px] text-[var(--lp-fg-faint)]">/100</span>
                  </p>
                  <p className="mt-1.5 text-[10px]" style={{ fontFamily: MONO, color: '#4ADE80' }}>
                    above senior band
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-4">
                {COMPETENCIES.map((c) => (
                  <div key={c.name}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12.5px] font-medium text-[var(--lp-fg)]">{c.name}</span>
                      <span className="flex items-center gap-1" aria-label={`${c.score} of 4`}>
                        {[0, 1, 2, 3].map((d) => (
                          <i
                            key={d}
                            className="block h-1.5 w-5 rounded-full"
                            style={{
                              background: d < c.score ? '#38BDF8' : 'rgba(255,255,255,0.08)',
                              boxShadow: d < c.score ? '0 0 10px rgba(56,189,248,0.45)' : 'none',
                            }}
                          />
                        ))}
                        <span className="ml-1.5 w-6 text-right text-[10.5px]" style={{ fontFamily: MONO, color: 'var(--lp-fg-faint)' }}>
                          {c.score}/4
                        </span>
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-[1.5] text-[var(--lp-fg-faint)]">{c.note}</p>
                  </div>
                ))}
              </div>

              <p
                className="mt-6 pt-4 text-[11px] leading-[1.6]"
                style={{ borderTop: '1px solid var(--lp-line-soft)', fontFamily: MONO, color: 'var(--lp-fg-faint)' }}
              >
                Illustrative. Live reports link each score to the exact answer it was drawn from.
              </p>
            </Card>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FAQ
   ══════════════════════════════════════════════════════════════════ */

const FAQS = [
  {
    q: 'Does the AI decide what to ask?',
    a: 'No. The blueprint — question count, order, target competency, difficulty band, rubric and scoring weight — is fixed before anyone joins. Deterministic Python reads the last answer and picks one of four approved branches. The model only phrases the question inside the slot it was given.',
  },
  {
    q: 'So do two candidates get different interviews?',
    a: 'They get the same interview asked differently. Same competencies in the same order, same difficulty band, same rubric maximum per question. What adapts is phrasing, depth, and how the next question refers back to what they just said.',
  },
  {
    q: 'Does this stop people using an LLM to answer?',
    a: 'It raises the cost sharply rather than claiming to be uncrackable. Questions are grounded in the candidate\'s own submission and the material you supplied, follow-ups chase specifics a generic answer cannot produce, and thin answers trigger evidence-seeking probes instead of moving on politely.',
  },
  {
    q: 'How long does a round take?',
    a: 'You set it. Most teams run six to ten questions, which lands between fifteen and thirty minutes. Rounds can be timed with a hard expiry or left untimed, and candidates take it asynchronously.',
  },
  {
    q: 'What does the recruiter actually have to configure?',
    a: 'Role family, seniority band and the focus areas you care about. Competencies, rubrics, question patterns and scenario artefacts come from the calibrated catalog — you are not writing questions or maintaining a bank.',
  },
  {
    q: 'How does it fit with the rest of the assessment?',
    a: 'It is a section like any other. Drop it into the builder next to your coding task, MCQ or ranking sections, and it scores into the same candidate report and pipeline.',
  },
];

function FaqSection() {
  const [open, setOpen] = useState(0);

  return (
    <Section id="faq">
      <Container>
        <Reveal>
          <Eyebrow>Straight answers</Eyebrow>
          <Heading className="mt-4 max-w-[640px]">
            The questions you were going to ask <Accent>anyway</Accent>.
          </Heading>
        </Reveal>

        <div className="mt-12 flex flex-col gap-2.5">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={Math.min(i, 4) * 0.05}>
                <div
                  className="overflow-hidden rounded-2xl transition-colors duration-300"
                  style={{
                    background: isOpen ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
                    border: `1px solid ${isOpen ? 'rgba(255,133,40,0.28)' : 'var(--lp-line-soft)'}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                  >
                    <span className="text-[14.5px] font-semibold leading-[1.4] text-[var(--lp-fg)]">{f.q}</span>
                    <span
                      className="ml-auto grid h-6 w-6 flex-shrink-0 place-items-center rounded-full transition-transform duration-300"
                      style={{
                        border: '1px solid var(--lp-line)',
                        transform: isOpen ? 'rotate(45deg)' : 'none',
                        color: isOpen ? 'var(--lp-ember-soft)' : 'var(--lp-fg-faint)',
                      }}
                    >
                      <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" aria-hidden="true">
                        <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>
                  <div
                    className="grid transition-all duration-300 ease-out"
                    style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 pr-12 text-[13.5px] leading-[1.7] text-[var(--lp-fg-dim)] sm:px-6 sm:pb-6">
                        {f.a}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FINAL CTA + FOOTER
   ══════════════════════════════════════════════════════════════════ */

function FinalCta() {
  return (
    <Section rule>
      <Container>
        <Reveal>
          <div
            className="relative overflow-hidden rounded-[28px] px-6 py-14 text-center sm:px-12 sm:py-20"
            style={{ background: 'linear-gradient(165deg, #1C1815, #100E0D)', border: '1px solid var(--lp-line)' }}
          >
            <div
              className="lp-aurora pointer-events-none absolute -bottom-[45%] left-1/2 h-[440px] w-[720px] -translate-x-1/2 rounded-full blur-[110px]"
              style={{ background: 'radial-gradient(circle, rgba(255,107,0,0.4), transparent 66%)' }}
              aria-hidden="true"
            />
            <div className="relative">
              <Heading className="mx-auto max-w-[640px]">
                Put it in front of your next <Accent>ten</Accent> candidates.
              </Heading>
              <Lede className="mx-auto mt-5 max-w-[520px]">
                Add an adaptive section to any assessment in the builder. No question bank to
                write, no calibration meeting to schedule.
              </Lede>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link to="/recruiter/assessments/new">
                  <PrimaryButton>
                    Build an interview
                    <ArrowIcon className="transition-transform duration-200 group-hover:translate-x-0.5" />
                  </PrimaryButton>
                </Link>
                <Link to="/recruiter/dashboard">
                  <GhostButton>Back to dashboard</GhostButton>
                </Link>
              </div>
              <p className="mt-7 text-[11px]" style={{ fontFamily: MONO, color: 'var(--lp-fg-faint)' }}>
                Bounded adaptation · fixed blueprint · full audit trail
              </p>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--lp-line-soft)' }}>
      <Container className="flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-6 w-6 place-items-center rounded-md text-[10px] font-bold text-[#180C03]"
            style={{ background: 'linear-gradient(135deg, var(--lp-ember-soft), var(--lp-ember))', fontFamily: MONO }}
          >
            T
          </span>
          <span className="text-[12.5px] text-[var(--lp-fg-dim)]">
            <span className="font-wordmark font-medium">Trudev</span> — AI Adaptive Interview
          </span>
        </div>
        <div className="flex items-center gap-6">
          {NAV_LINKS.slice(0, 3).map((l) => (
            <a key={l.href} href={l.href} className="text-[12px] text-[var(--lp-fg-faint)] transition-colors hover:text-[var(--lp-fg-dim)]">
              {l.label}
            </a>
          ))}
        </div>
      </Container>
    </footer>
  );
}
