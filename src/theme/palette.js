// ─────────────────────────────────────────────────────────────────────────────
// Trudev — Global Color Palette
//
// All colors used by the app live here. Two surfaces:
//
//   • RECRUITER_PALETTE — light surfaces, brand-driven accent (cyan default).
//                         Brand color is overridden per-organization at runtime.
//
//   • CANDIDATE_PALETTE — dark surfaces used by candidate / user-facing flows.
//                         Centralized so the palette can be tweaked in one
//                         place without touching screens.
//
// To experiment, edit the hex values below. CSS variables are derived from
// these objects at runtime in `RecruiterThemeProvider` / `CandidateTheme`.
// ─────────────────────────────────────────────────────────────────────────────

export const RECRUITER_PALETTE = {
  // ── Surfaces ──────────────────────────────────────────────────────────────
  pageBg:        '#FBF9F4', // Slate 50  — fixed, NOT brand-driven
  surface:       '#FFFFFF', // card surfaces
  surfaceMuted:  '#F1F5F9', // Slate 100 — input fills, sub-surfaces
  surfaceHover:  '#F8FAFC',
  sidebarBgTop:   '#FF8528',
  sidebarBgMid:   '#FF8528',
  sidebarBgBottom:'#FF8528',
  sidebarControl: '#090E18',
  sidebarControlHover:'#111827',
  sidebarControlText:'#FFFFFF',
  sidebarText:    '#FFFFFF',
  sidebarMuted:   '#FFFFFF',
  sidebarIcon:    '#FFFFFF',
  sidebarActive:  '#FFFFFF',
  sidebarStroke:  '#DCE5F5',
  sidebarShadow:  'rgba(15, 23, 42, 0.14)',
  assessmentAccent:'#FF8528',
  assessmentStepActive:'#FF8528',
  assessmentCta:  '#FF8528',
  assessmentCtaHover:'#eb6f0f',
  assessmentCtaText:'#FFFFFF',
  assessmentAllocation:'#FF7A1A',
  // Fixed ember tint + its text colour, to pair with `assessmentCta` above.
  // The brand family already has a tint/deep pair, but those are REPLACED at
  // runtime with the org's own colour — so a component using them next to an
  // `assessmentCta` button ends up half brand-coloured and half ember. These
  // are for surfaces that must stay ember for every org: onboarding especially,
  // which runs before the org has picked a brand colour at all.
  assessmentTint: '#FFE8D5', // Ember 100 — selected / badge background
  assessmentTintText:'#9A4405', // Ember 800 — 7.4:1 on assessmentTint
  reportMetricStart:'#6678EF',
  reportMetricEnd:'#32B5C2',
  reportMetricIconBg:'#90A6F8',
  reportMetricIconText:'#6F82F4',
  reportEmailText:'#9AA9BD',
  pipelineCanvas:'#F0EEE7',
  pipelinePanel:'#FFFFFF',
  pipelineToolbar:'#F6F6F6',
  pipelineTableHeader:'#FAFAFA',
  pipelineNotice:'#000000',
  pipelineSelected:'#FF791F',
  pipelineSelectedText:'#1D4DFF',
  pipelineShadow:'rgba(15, 23, 42, 0.08)',
  pipelineStageShortlistedText:'#4A63D9',
  pipelineStageShortlistedBg:'#EEF1FF',
  pipelineStageShortlistedBorder:'#B8C3FF',
  pipelineStageRejectedText:'#D80000',
  pipelineStageRejectedBg:'#FFE8E8',
  pipelineStageRejectedBorder:'#FFB8B8',
  pipelineStageHiredText:'#2F8F16',
  pipelineStageHiredBg:'#EAF8E4',
  pipelineStageHiredBorder:'#BDE9AE',
  pipelineStageSubmittedText:'#737373',
  pipelineStageSubmittedBg:'#F2F2F2',
  pipelineStageSubmittedBorder:'#D3D3D3',
  pipelineStageReviewingText:'#D58A00',
  pipelineStageReviewingBg:'#FFF5DD',
  pipelineStageReviewingBorder:'#F6D18A',

  // ── Dashboard chart ring colors ───────────────────────────────────────────
  dashboardRingClosed:       '#FFAA00',
  dashboardRingActive:       '#FD890D',
  dashboardRingDraft:        '#F17C0E',
  dashboardRingExpiredLinks: '#F96915',
  dashboardOrangeTint:       '#FFF4EC',
  dashboardOrangeBorder:     '#FFD4A8',

  // ── Borders ───────────────────────────────────────────────────────────────
  border:        '#E2E8F0', // Slate 200
  borderStrong:  '#CBD5E1', // Slate 300
  borderSubtle:  '#EEF2F6',

  // ── Text ──────────────────────────────────────────────────────────────────
  textPrimary:   '#0F172A', // Slate 900
  textSecondary: '#64748B', // Slate 500
  textMuted:     '#94A3B8', // Slate 400
  textFaint:     '#CBD5E1', // Slate 300

  // ── Brand accent (DEFAULT — overridden per-org) ───────────────────────────
  // The product default brand is Ember Orange. Derived shades are computed at
  // runtime by `derive.js`; the values here mirror those defaults so styles
  // look correct before any branding is loaded.
  brand:         '#FF8528', // Ember 500 — primary
  brandHover:    '#EB6F0F', // Ember 600
  brandDeep:     '#9A4405', // Ember 800 — text on brand-tint background
  brandNavy:     '#5C2803', // Ember 900 — icon/text on solid brand button
  brandTint:     '#FFE8D5', // Ember 100 — badge / active background
  brandTintLight:'#FFF4EC', // Ember 50  — hover states
  brandBorder:   '#9A4405',
  onBrand:       '#2A1405', // text/icon color on top of solid `brand`

  // ── Status (semantic, not brand-driven) ───────────────────────────────────
  success:       '#16A34A',
  successBg:     '#F0FDF4',
  successBorder: '#86EFAC',

  warning:       '#D97706',
  warningBg:     '#FFFBEB',
  warningBorder: '#FCD34D',

  error:         '#DC2626',
  errorBg:       '#FEF2F2',
  errorBorder:   '#FCA5A5',

  info:          '#9A4405',
  infoBg:        '#FFE8D5',
  infoBorder:    '#FFC56E',
};

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE PALETTE — dark theme, "warm charcoal + ember".
//
// Surfaces are near-black with a deliberate warm (red/brown) cast so the orange
// brand sits in the same family as the ground instead of vibrating against a
// cold blue-black. Text neutrals are warm for the same reason.
//
// Applied at runtime by `applyCandidatePalette()` in CandidateThemeProvider,
// scoped to the `.candidate-theme` wrapper so recruiter screens are untouched.
// ─────────────────────────────────────────────────────────────────────────────
export const CANDIDATE_PALETTE = {
  // ── Surfaces ──────────────────────────────────────────────────────────────
  // Three readable planes rather than one flat black: chrome sits below the
  // stage, cards sit above it.
  chromeBg:      '#1B1917', // top bar, sidebar, action bar
  pageBg:        '#211E1B', // the stage
  surface:       '#282420', // option rows, cards
  surfaceMuted:  '#2F2A26', // navigator cells, inset fills
  surfaceHover:  '#363029',
  surfaceRaised: '#3A342E', // modals / lifted surfaces

  // ── Borders ───────────────────────────────────────────────────────────────
  border:        '#484039',
  borderStrong:  '#5B524A',
  borderSubtle:  '#39332E',

  // ── Text (warm neutrals, never blue-white) ────────────────────────────────
  textPrimary:   '#FBF6F3',
  textSecondary: '#B5ABA4',
  textMuted:     '#8A7E77',
  textFaint:     '#6B615B',

  // ── Brand — Ember Orange ──────────────────────────────────────────────────
  // Tints sit ABOVE the card surface so a selected row reads as lit, not as a
  // hole punched in the page.
  brand:         '#FF8528',
  brandHover:    '#EB6F0F',
  brandDeep:     '#FFB367', // readable ember text ON brandTint
  brandNavy:     '#2A1405', // icon/text on solid brand
  brandTint:     '#3A2313', // selected / badge background
  brandTintLight:'#4A2D17', // hover background
  brandBorder:   '#8A4614',
  onBrand:       '#1C0E04', // text on solid brand (8.4:1)

  // ── Ember scale — meters, progress, filled navigator cells ────────────────
  ember:         '#FF6B00', // hottest core
  emberBright:   '#FF8528',
  emberSoft:     '#FFA94D',
  emberFaint:    '#FFC56E',
  emberPale:     '#F9CBA7', // solid fill that carries dark text (answered cells)
  emberGlow:     'rgba(255, 107, 0, 0.45)',
  emberWash:     'rgba(255, 133, 40, 0.08)',
  emberEdge:     'rgba(255, 133, 40, 0.22)',

  // ── Status ────────────────────────────────────────────────────────────────
  // Orange is the brand now, so it can no longer mean "caution". Warning moves
  // to yellow and error to a pink-shifted red — both far enough in hue from
  // #FF8528 to stay unambiguous at badge size.
  success:       '#5BD98A',
  successBg:     '#16261C',
  successBorder: '#2B4F38',

  warning:       '#FACC15',
  warningBg:     '#2A2410',
  warningBorder: '#5E4C12',

  error:         '#FF3B63',
  errorBg:       '#2E1319',
  errorBorder:   '#7A2233',

  info:          '#FFB367',
  infoBg:        '#3A2313',
  infoBorder:    '#8A4614',

  // ── Recruiter accent (used on the split login screen) ─────────────────────
  recruiterAccent:       '#FFC56E',
  recruiterAccentDim:    'rgba(255, 197, 110, 0.12)',
  recruiterAccentGlow:   'rgba(255, 197, 110, 0.25)',
  recruiterAccentBorder: 'rgba(255, 197, 110, 0.35)',
};

// CSS variable name table — keep in sync with tailwind.config.js semantic tokens
export const CSS_VAR_KEYS = {
  pageBg:         '--color-page',
  surface:        '--color-surface',
  surfaceMuted:   '--color-surface-muted',
  surfaceHover:   '--color-surface-hover',
  surfaceRaised:  '--color-surface-raised',
  chromeBg:       '--color-chrome',
  ember:          '--color-ember',
  emberBright:    '--color-ember-bright',
  emberSoft:      '--color-ember-soft',
  emberFaint:     '--color-ember-faint',
  emberPale:      '--color-ember-pale',
  emberGlow:      '--color-ember-glow',
  emberWash:      '--color-ember-wash',
  emberEdge:      '--color-ember-edge',
  sidebarBgTop:   '--color-sidebar-bg-top',
  sidebarBgMid:   '--color-sidebar-bg-mid',
  sidebarBgBottom:'--color-sidebar-bg-bottom',
  sidebarControl: '--color-sidebar-control',
  sidebarControlHover:'--color-sidebar-control-hover',
  sidebarControlText:'--color-sidebar-control-text',
  sidebarText:    '--color-sidebar-text',
  sidebarMuted:   '--color-sidebar-muted',
  sidebarIcon:    '--color-sidebar-icon',
  sidebarActive:  '--color-sidebar-active',
  sidebarStroke:  '--color-sidebar-stroke',
  sidebarShadow:  '--color-sidebar-shadow',
  assessmentAccent:'--color-assessment-accent',
  assessmentStepActive:'--color-assessment-step-active',
  assessmentCta:  '--color-assessment-cta',
  assessmentCtaHover:'--color-assessment-cta-hover',
  assessmentCtaText:'--color-assessment-cta-text',
  assessmentAllocation:'--color-assessment-allocation',
  assessmentTint: '--color-assessment-tint',
  assessmentTintText:'--color-assessment-tint-text',
  reportMetricStart:'--color-report-metric-start',
  reportMetricEnd:'--color-report-metric-end',
  reportMetricIconBg:'--color-report-metric-icon-bg',
  reportMetricIconText:'--color-report-metric-icon-text',
  reportEmailText:'--color-report-email-text',
  pipelineCanvas:'--color-pipeline-canvas',
  pipelinePanel:'--color-pipeline-panel',
  pipelineToolbar:'--color-pipeline-toolbar',
  pipelineTableHeader:'--color-pipeline-table-header',
  pipelineNotice:'--color-pipeline-notice',
  pipelineSelected:'--color-pipeline-selected',
  pipelineSelectedText:'--color-pipeline-selected-text',
  pipelineShadow:'--color-pipeline-shadow',
  pipelineStageShortlistedText:'--color-pipeline-stage-shortlisted-text',
  pipelineStageShortlistedBg:'--color-pipeline-stage-shortlisted-bg',
  pipelineStageShortlistedBorder:'--color-pipeline-stage-shortlisted-border',
  pipelineStageRejectedText:'--color-pipeline-stage-rejected-text',
  pipelineStageRejectedBg:'--color-pipeline-stage-rejected-bg',
  pipelineStageRejectedBorder:'--color-pipeline-stage-rejected-border',
  pipelineStageHiredText:'--color-pipeline-stage-hired-text',
  pipelineStageHiredBg:'--color-pipeline-stage-hired-bg',
  pipelineStageHiredBorder:'--color-pipeline-stage-hired-border',
  pipelineStageSubmittedText:'--color-pipeline-stage-submitted-text',
  pipelineStageSubmittedBg:'--color-pipeline-stage-submitted-bg',
  pipelineStageSubmittedBorder:'--color-pipeline-stage-submitted-border',
  pipelineStageReviewingText:'--color-pipeline-stage-reviewing-text',
  pipelineStageReviewingBg:'--color-pipeline-stage-reviewing-bg',
  pipelineStageReviewingBorder:'--color-pipeline-stage-reviewing-border',
  dashboardRingClosed:       '--color-dashboard-ring-closed',
  dashboardRingActive:       '--color-dashboard-ring-active',
  dashboardRingDraft:        '--color-dashboard-ring-draft',
  dashboardRingExpiredLinks: '--color-dashboard-ring-expired-links',
  dashboardOrangeTint:       '--color-dashboard-orange-tint',
  dashboardOrangeBorder:     '--color-dashboard-orange-border',
  border:         '--color-border',
  borderStrong:   '--color-border-strong',
  borderSubtle:   '--color-border-subtle',
  textPrimary:    '--color-text-primary',
  textSecondary:  '--color-text-secondary',
  textMuted:      '--color-text-muted',
  textFaint:      '--color-text-faint',
  brand:          '--color-brand',
  brandHover:     '--color-brand-hover',
  brandDeep:      '--color-brand-deep',
  brandNavy:      '--color-brand-navy',
  brandTint:      '--color-brand-tint',
  brandTintLight: '--color-brand-tint-light',
  brandBorder:    '--color-brand-border',
  onBrand:        '--color-on-brand',
  success:        '--color-success',
  successBg:      '--color-success-bg',
  successBorder:  '--color-success-border',
  warning:        '--color-warning',
  warningBg:      '--color-warning-bg',
  warningBorder:  '--color-warning-border',
  error:          '--color-error',
  errorBg:        '--color-error-bg',
  errorBorder:    '--color-error-border',
  info:           '--color-info',
  infoBg:         '--color-info-bg',
  infoBorder:     '--color-info-border',
};
