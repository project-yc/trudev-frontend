// ─────────────────────────────────────────────────────────────────────────────
// Recruiter onboarding — one card over the dashboard they are about to get.
//
// This replaced a four-step wizard (org details → branding → invite team →
// review). The wizard asked for ten inputs before anyone saw the product; the
// two most expensive ones — brand colour / logo and teammate emails — are
// decisions nobody can make in their second minute on a tool they have not
// evaluated yet. Both now live where they belong: branding in Settings, invites
// on the dashboard's own "Invite your team" card.
//
// It is a modal rather than its own page on purpose. The destination sits
// behind the glass the whole time, so the remaining effort reads as "one card"
// instead of "a gate before the product" — and on submit the blur resolves to
// zero and the dashboard sharpens into focus underneath.
//
// The backdrop is the real recruiter shell wrapped around the real empty-state
// dashboard, not a mock of one. A workspace this new always has zero
// assessments, so that IS what lands when the modal goes — which is why the
// route swap at the end is invisible.
//
// The backend contract is unchanged. `industry`, `website`, `brand_color`,
// `candidate_name` and `tagline` are still sent — derived or defaulted here
// rather than typed by the user.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '../../../components/ui/dialog';
import RecruiterLayout from '../RecruiterLayout';
import EmptyDashboardState from '../dashboard/components/EmptyDashboardState';
import truDevLogo from '../../../assets/icons/trudev_logo.svg';
import peekCharacter from '../../../assets/recruiter/images/onboarding_peek.png';
import { saveOrgDetails, launchWorkspace } from '../../../api/recruiter/onboarding';

// Mirrors .animate-ob-card-out and the backdrop transition in index.css. The
// card is gone well before the blur finishes so the reveal is the last thing
// on screen; the route swaps only once the dashboard is already sharp.
const OB_CARD_EXIT_MS = 220;
const OB_REVEAL_MS    = 460;

// Drop the character art in here when it lands — the two slots are laid out in
// Figma on node 1409-10522. Until then the greeting simply fills the row, which
// is why this renders conditionally rather than reserving empty space.
const HERO_ILLUSTRATION = null;

// Default workspace brand. Recruiters no longer pick this during onboarding —
// enterprise plans override it from Settings → Organization.
const DEFAULT_BRAND_COLOR = '#FB7414';

// Values are the exact strings the previous wizard sent, so nothing downstream
// has to learn a new vocabulary. Labels are what the recruiter reads.
const TEAM_SIZES = [
  { label: '1–10',    value: '1 – 10'    },
  { label: '11–50',   value: '11 – 50'   },
  { label: '51–200',  value: '51 – 200'  },
  { label: '201–500', value: '201 – 500' },
  { label: '500+',    value: '500+'      },
];

// The one question with a payoff: each pick becomes a template filter on the
// other side of the door. `query` is what the template gallery searches for.
const HIRING_FOR = [
  { label: 'Frontend',     query: 'Frontend'   },
  { label: 'Backend',      query: 'Backend'    },
  { label: 'Full-stack',   query: 'Full stack' },
  { label: 'Data & ML',    query: 'Data'       },
  { label: 'DevOps / SRE', query: 'DevOps'     },
  { label: 'Mobile',       query: 'Mobile'     },
  { label: 'QA',           query: 'QA'         },
  { label: 'Other',        query: ''           },
];

const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'live.com', 'icloud.com', 'me.com', 'aol.com', 'protonmail.com', 'proton.me',
]);

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}

// Signup requires a work email, so the domain is a reliable first guess at the
// company name — one less field the recruiter has to think about. Google auth
// can still deliver a personal address, hence the guard.
function companyFromEmail(email) {
  const domain = String(email || '').split('@')[1]?.toLowerCase().trim();
  if (!domain || PERSONAL_EMAIL_DOMAINS.has(domain)) return { name: '', domain: '' };

  const labels = domain.split('.');
  // `mail.acme.co.uk` → `acme`: drop the TLD (and a two-letter country suffix),
  // then take the last remaining label.
  const tldLength = labels.length > 2 && labels.at(-1).length === 2 && labels.at(-2).length <= 3 ? 2 : 1;
  const root = labels.slice(0, -tldLength).at(-1) || labels[0];

  const name = root
    .split(/[-_]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return { name, domain };
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

// Built on Button so it inherits the disabled handling and sizing.
//
// Selected state is a *tint* rather than a solid fill: at 12.5px, white on the
// ember orange sits around 2:1 contrast and reads as disabled.
//
// Deliberately the fixed `assessment-*` family, NOT `brand-*`. The brand tokens
// are replaced at runtime with the org's own colour, so on a blue-branded
// workspace the chips turned blue while the CTA beside them — which uses
// `assessment-cta` — stayed orange. Onboarding runs before the org has even
// picked a brand colour, so brand-derived tokens have no business here.
function Chip({ label, selected, onClick }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'h-[34px] rounded-full px-3.5 text-[12.5px] font-medium',
        // index.css declares a global `*:focus-visible { outline: 2px solid
        // var(--color-brand) }` which beats Button's unqualified `outline-none`
        // on specificity — that was a second way the org's brand colour leaked
        // in, ringing every chip. `!` wins it back; the warm halo replaces it.
        '!outline-none focus-visible:ring-[3px] focus-visible:ring-[#1C1410]/10',
        selected
          ? [
              'border-[var(--color-assessment-cta)] font-semibold',
              'bg-[var(--color-assessment-tint)] hover:bg-[var(--color-assessment-tint)]',
              'text-[var(--color-assessment-tint-text)]',
            ]
          : 'text-text-secondary hover:border-border-strong hover:text-text-primary',
      )}
    >
      {label}
    </Button>
  );
}

function Field({ label, hint, htmlFor, children }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label
          htmlFor={htmlFor}
          className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-text-muted"
        >
          {label}
        </Label>
        {hint && <span className="text-[11px] text-text-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate();

  const user = useMemo(() => readJson('user'), []);
  const firstName = String(user?.full_name || user?.name || '').split(' ')[0];
  const userName = user?.full_name || user?.name || user?.email || 'Recruiter';
  const guess = useMemo(() => companyFromEmail(user?.email), [user]);

  const [companyName, setCompanyName] = useState(() => readJson('org')?.name || guess.name);
  const [teamSize, setTeamSize]       = useState('');
  const [roles, setRoles]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [leaving, setLeaving]         = useState(false);
  const [error, setError]             = useState('');

  const toggleRole = (label) =>
    setRoles(prev => (prev.includes(label) ? prev.filter(r => r !== label) : [...prev, label]));

  // What the payoff line promises. Kept to two names so it stays a sentence.
  const payoff = useMemo(() => {
    const named = roles.filter(r => r !== 'Other');
    if (named.length === 0) return null;
    if (named.length <= 2) return named.join(' and ');
    return `${named.slice(0, 2).join(', ')} and ${named.length - 2} more`;
  }, [roles]);

  const finish = async () => {
    const name = companyName.trim() || guess.name || 'My workspace';
    setError('');
    setLoading(true);
    try {
      await saveOrgDetails({
        company_name: name,
        company_size: teamSize,
        // Dropped from the UI — the wizard collected both and nothing in the
        // product ever read them back. The website is free and accurate from
        // the work-email domain, so it still goes across.
        industry: '',
        website: guess.domain ? `https://${guess.domain}` : '',
      });

      const result = await launchWorkspace({
        logo: null,
        brand_color: DEFAULT_BRAND_COLOR,
        // Candidates see a name, not a blank. Enterprise plans can change this
        // in Settings; everyone else gets a sane default instead of a field.
        candidate_name: name,
        tagline: '',
      });

      const org = readJson('org');
      localStorage.setItem('org', JSON.stringify({
        ...org,
        name,
        is_onboarded: true,
        // A workspace that just finished onboarding has no assessments, and we
        // know it here without asking. The dashboard reads this for its first
        // paint so it stops flashing the populated layout while stats load.
        guide: true,
        // No backend field for this yet — it steers the template deep-link on
        // the empty dashboard and costs nothing if it is missing.
        hiring_for: roles.map(label => HIRING_FOR.find(r => r.label === label)?.query).filter(Boolean),
        branding: { ...org.branding, ...result?.branding },
      }));

      // Hand the screen over to the reveal: card out, blur to zero, and only
      // then swap the route — by which point the backdrop already looks exactly
      // like the destination, so the swap itself is invisible.
      setLeaving(true);
      setTimeout(() => navigate('/recruiter/dashboard', { replace: true }), OB_REVEAL_MS);
    } catch (e) {
      setError(e?.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const noop = () => {};

  return (
    <>
      {/* Backdrop — the real shell around the real empty state, blurred and
          inert. Radix already hides it from assistive tech while the dialog is
          open; `inert` also takes it out of the tab order for good measure. */}
      <div
        aria-hidden
        inert
        className="fixed inset-0 overflow-hidden"
        style={{
          filter: leaving ? 'blur(0px)' : 'blur(14px)',
          transition: `filter ${OB_REVEAL_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        <RecruiterLayout>
          <div className="flex h-full flex-col bg-page px-[18px] pb-4 pt-3">
            <EmptyDashboardState
              userName={userName}
              onCreateAssessment={noop}
              onInviteTeam={noop}
              onOpenLibrary={noop}
              onBrowseTemplates={noop}
              onSeeHowItWorks={noop}
            />
          </div>
        </RecruiterLayout>
      </div>

      <Dialog open>
        <DialogContent
          showClose={false}
          // Non-dismissible: the org has to be marked onboarded or the route
          // guard bounces them straight back here. "Skip for now" is the exit,
          // and it submits with the prefilled name rather than doing nothing.
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          overlayClassName={cn(
            // No backdrop-blur here — the backdrop element blurs itself, and
            // stacking a second blur on top of it only muddies the reveal.
            'bg-[#1C1410]/30 backdrop-blur-0 transition-opacity',
            leaving && 'opacity-0',
          )}
          style={{ transitionDuration: `${OB_REVEAL_MS}ms` }}
          className={cn(
            // Bottom sheet on phones, centred card from `sm` up.
            'w-full max-w-none sm:w-[calc(100%-2rem)] sm:max-w-[560px]',
            // The extra 58px is half the character's height: it centres the
            // card *plus* the figure standing on it, rather than centring the
            // card alone and letting the figure run off the top of a short
            // laptop viewport.
            'bottom-0 top-auto translate-y-0 sm:bottom-auto sm:top-1/2 sm:translate-y-[calc(-50%+58px)]',
            // Stripped back to a positioning shell. The card's own surface,
            // radius and shadow moved to the panel below so this element can
            // stay overflow-visible — the peeking character hangs above the
            // card's top edge and a scroll container here would clip it off.
            'overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none',
            // The shared `animate-slideInUp` animates `transform`, which would
            // clobber the centring translate above. Motion lives on the inner
            // wrapper instead, where it has no positioning job to break.
            'animate-none',
          )}
        >
          <div
            className={cn(
              'relative',
              leaving ? 'animate-ob-card-out' : 'animate-ob-card-in',
            )}
          >
            {/* Peeking character. Sits on the card's top edge with a 1px
                overlap so no hairline shows between the hands and the card.
                Desktop only — the mobile sheet is nearly full height, leaving
                nothing above it to peek over. */}
            <img
              src={peekCharacter}
              alt=""
              aria-hidden
              draggable={false}
              className="pointer-events-none absolute bottom-full right-7 -mb-px hidden w-[150px] select-none sm:block"
            />

            <div
              className={cn(
                'rounded-b-none rounded-t-[22px] bg-surface sm:rounded-[24px]',
                'shadow-[0_24px_60px_-12px_rgba(23,15,10,0.28)]',
                // Capped so the card plus the character above it still fit a
                // short laptop viewport; the card scrolls before it collides.
                'max-h-[94vh] overflow-y-auto sm:max-h-[calc(100vh-150px)]',
                'px-6 py-7 sm:px-8',
              )}
            >
            {/* Wordmark + the escape hatch */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <img src={truDevLogo} alt="" className="h-[19px] w-[19px]" />
                <span className="font-wordmark text-[16px] font-medium text-text-primary">
                  TruDev
                </span>
              </div>
              <button
                type="button"
                onClick={finish}
                disabled={loading || leaving}
                className="text-[12.5px] font-medium text-text-muted transition-colors hover:text-text-primary disabled:opacity-50"
              >
                Skip for now
              </button>
            </div>

            {/* Greeting. The time estimate is the single cheapest thing you can
                put on an onboarding screen — it caps the perceived cost before
                the user has read a single field. */}
            <div className="mt-6 flex items-center gap-[18px]">
              {HERO_ILLUSTRATION && (
                <img
                  src={HERO_ILLUSTRATION}
                  alt=""
                  className="h-[112px] w-[112px] flex-shrink-0 select-none"
                  draggable={false}
                />
              )}
              <div className="min-w-0">
                <DialogTitle className="font-sans text-[26px] font-bold leading-[1.2] tracking-[-0.025em] text-text-primary sm:text-[30px]">
                  {firstName ? (
                    <>Welcome, <span className="text-[var(--color-assessment-accent)]">{firstName}</span>.</>
                  ) : (
                    <>Welcome to <span className="font-wordmark font-medium">TruDev</span>.</>
                  )}
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-[14px] leading-[1.5] text-text-secondary">
                  Three answers and your workspace is ready — about twenty seconds.
                </DialogDescription>
              </div>
            </div>

            <div className="my-6 h-px bg-border-subtle" />

            <div className="space-y-[18px]">
              <Field
                label="Company"
                htmlFor="ob-company"
                hint={guess.domain && companyName === guess.name ? `from ${guess.domain}` : null}
              >
                <div className="relative">
                  <Input
                    id="ob-company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme"
                    autoComplete="organization"
                    // No focus override: the shared Input now keeps its border
                    // steady and carries focus on a warm halo alone. Colouring
                    // it here would reintroduce the org's brand tint.
                    className="h-[42px] rounded-[10px] pr-9 text-[14px]"
                  />
                  {companyName.trim() && (
                    <Check
                      className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success"
                      strokeWidth={2.5}
                    />
                  )}
                </div>
              </Field>

              <Field label="Team size">
                <div className="flex flex-wrap gap-2">
                  {TEAM_SIZES.map(({ label, value }) => (
                    <Chip
                      key={value}
                      label={label}
                      selected={teamSize === value}
                      onClick={() => setTeamSize(teamSize === value ? '' : value)}
                    />
                  ))}
                </div>
              </Field>

              <Field label="Hiring for" hint="pick any">
                <div className="flex flex-wrap gap-2">
                  {HIRING_FOR.map(({ label }) => (
                    <Chip
                      key={label}
                      label={label}
                      selected={roles.includes(label)}
                      onClick={() => toggleRole(label)}
                    />
                  ))}
                </div>

                {/* The reason this question is not a survey: the answer is
                    visibly spent on something before the user leaves the card. */}
                <div className="mt-3.5 flex min-h-[18px] items-start gap-2">
                  {payoff ? (
                    <>
                      <Sparkles
                        className="mt-px h-3.5 w-3.5 flex-shrink-0 text-[var(--color-assessment-accent)]"
                      />
                      <p className="text-[12.5px] leading-[1.45] text-text-secondary">
                        We&apos;ll open your workspace with{' '}
                        <span className="font-medium text-text-primary">{payoff}</span> templates ready to use.
                      </p>
                    </>
                  ) : (
                    <p className="text-[12.5px] leading-[1.45] text-text-faint">
                      We&apos;ll line up matching assessment templates on your dashboard.
                    </p>
                  )}
                </div>
              </Field>
            </div>

            {error && (
              <div className="mt-4 rounded-[10px] border border-error-border bg-error-bg px-4 py-3 text-[13px] text-error">
                {error}
              </div>
            )}

            <Button
              type="button"
              variant="cta"
              onClick={finish}
              disabled={loading || leaving}
              className="mt-6 h-[46px] w-full rounded-[12px] text-[14px]"
            >
              {loading || leaving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Setting up your workspace…
                </>
              ) : (
                <>
                  Enter workspace
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </>
              )}
            </Button>

              <p className="mt-3.5 text-center text-[11.5px] text-text-faint">
                Logo, brand colour and teammates — all editable later in Settings.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
