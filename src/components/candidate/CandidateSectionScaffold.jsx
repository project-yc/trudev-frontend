import {
  CandidateThemeScope,
  loadCandidateBranding,
} from '../../theme/CandidateThemeProvider.jsx'

// TruDev logo — served from /public
const TRUDEV_LOGO = '/Green Black Minimal Professional Letter D Business Corporate Logo 1234.png'

// Org header rendered above the content card — shows the hiring org's logo,
// candidate-facing name, and optional tagline. Keeps the page feeling branded
// without burying the form card in chrome.
function OrgBrandHeader({ branding }) {
  const { logo_url, candidate_name, tagline } = branding || {}
  if (!logo_url && !candidate_name) return null
  return (
    <div className="flex flex-col items-center gap-2.5 text-center animate-fadeIn">
      {logo_url && (
        <img
          src={logo_url}
          alt={candidate_name || 'Organization'}
          className="h-12 w-auto object-contain"
        />
      )}
      {candidate_name && (
        <p className="text-text-primary font-bold text-lg leading-snug">{candidate_name}</p>
      )}
      {tagline && (
        <p className="text-text-muted text-sm">{tagline}</p>
      )}
    </div>
  )
}

export function CandidatePageShell({ children, maxWidth = 'max-w-lg' }) {
  const branding = loadCandidateBranding()

  return (
    <CandidateThemeScope branding={branding}>
      <div className="min-h-screen bg-page flex flex-col items-center justify-center px-4 py-10 gap-6">
        <OrgBrandHeader branding={branding} />
        <div className={`w-full ${maxWidth} bg-surface rounded-2xl border border-border-default shadow-lift animate-slideInUp`}>
          <div className="p-8 space-y-6">
            {children}
          </div>
        </div>
        <CandidateFooter />
      </div>
    </CandidateThemeScope>
  )
}

export function CandidateFooter() {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="text-text-faint text-xs">Powered by</span>
      <img
        src={TRUDEV_LOGO}
        alt="TruDev"
        className="h-4 w-auto object-contain rounded-sm opacity-50"
      />
      <span className="font-wordmark text-text-muted text-xs font-medium tracking-tight">TruDev</span>
    </div>
  )
}

export function CandidateCompletionScreen({
  title = 'Assessment Complete',
  message,
  details,
  maxWidth = 'max-w-md',
}) {
  return (
    <CandidatePageShell maxWidth={maxWidth}>
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-tint border border-brand-border flex items-center justify-center">
          <span className="text-brand text-2xl font-bold">✓</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-text-primary text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-text-secondary text-sm leading-relaxed">{message}</p>
        </div>
        {details ?? null}
      </div>
    </CandidatePageShell>
  )
}

export function CandidateCenteredLoadingState({ label }) {
  return (
    <CandidateThemeScope>
      <div className="min-h-screen bg-page flex items-center justify-center gap-3 text-text-secondary text-sm">
        <div className="w-4 h-4 border-2 border-border-strong border-t-brand rounded-full animate-spin" />
        {label}
      </div>
    </CandidateThemeScope>
  )
}

export function CandidateCenteredErrorState({ title, message }) {
  return (
    <CandidateThemeScope>
      <div className="min-h-screen bg-page flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 animate-slideInUp text-center">
          <div className="w-14 h-14 rounded-full bg-error-bg border border-error-border flex items-center justify-center mx-auto">
            <span className="text-error text-2xl font-bold">!</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-text-primary text-xl font-bold">{title}</h1>
            <p className="text-text-secondary text-sm">{message}</p>
          </div>
        </div>
      </div>
    </CandidateThemeScope>
  )
}

export function CandidateErrorBanner({ children }) {
  return (
    <div className="rounded-xl border border-error-border bg-error-bg px-4 py-3 text-sm text-error">
      {children}
    </div>
  )
}

export function CandidatePrimaryButton({ children, className = '', disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-2 py-3.5
        bg-brand hover:bg-brand-hover text-on-brand
        font-semibold rounded-xl text-sm
        transition-all duration-150 ease-out
        active:scale-[0.97]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
        ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function CandidateSecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`px-4 py-2.5 border border-border-default text-text-secondary
        hover:text-text-primary hover:border-border-strong
        rounded-xl text-sm font-medium transition-all duration-150 ease-out active:scale-[0.97]
        disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function CandidateSectionIntroScreen({
  eyebrow,
  title,
  subtitle,
  metaItems = [],
  noticeTitle = 'Before you begin',
  tips = [],
  error,
  actionContent,
  onAction,
  actionDisabled = false,
  maxWidth = 'max-w-lg',
  consent,
}) {
  return (
    <CandidatePageShell maxWidth={maxWidth}>
      <div className="text-center space-y-2">
        <p className="text-brand-deep text-xs font-semibold uppercase tracking-widest">
          {eyebrow}
        </p>
        <h1 className="text-text-primary text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-text-secondary text-sm">{subtitle}</p> : null}
      </div>

      {metaItems.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {metaItems.map((item, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 text-xs text-text-secondary bg-surface-muted border border-border-default px-2.5 py-1 rounded-full"
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}

      {tips.length > 0 ? (
        <div className="bg-surface-muted border border-border-default rounded-xl px-4 py-4 space-y-2.5">
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wide">{noticeTitle}</p>
          <ul className="space-y-2">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2.5 text-text-secondary text-sm">
                <span className="w-1 h-1 rounded-full bg-text-muted shrink-0 mt-2" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {consent ? (
        <label className="flex items-start gap-3 rounded-xl border border-border-default bg-surface-muted px-4 py-3.5 text-sm text-text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={consent.checked}
            onChange={(e) => consent.onChange(e.target.checked)}
            className="mt-0.5 w-4 h-4 shrink-0 rounded border-border-strong accent-brand cursor-pointer"
          />
          <span>{consent.label}</span>
        </label>
      ) : null}

      {error ? <CandidateErrorBanner>{error}</CandidateErrorBanner> : null}

      <CandidatePrimaryButton onClick={onAction} disabled={actionDisabled}>
        {actionContent}
      </CandidatePrimaryButton>
    </CandidatePageShell>
  )
}