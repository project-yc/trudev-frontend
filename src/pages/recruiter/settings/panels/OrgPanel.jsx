// Organisation tab — the org the current session belongs to.
//
// Read-only for the same reason as ProfilePanel: the only org data available
// is what `/api/auth/v1/me` returns. The branding endpoint that
// `api/org/branding.js` points at does not exist on the backend yet, so the
// brand colour is shown as configured rather than offered as an editor.
import { useAuth } from '../../../../auth/authContext';

function Row({ label, value, mono }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border-subtle py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <p className="w-[150px] flex-shrink-0 text-[13px] text-text-secondary">{label}</p>
      <div className={`min-w-0 break-words text-[13.5px] text-text-primary ${mono ? 'font-mono text-[12.5px]' : ''}`}>
        {value || <span className="text-text-muted">Not set</span>}
      </div>
    </div>
  );
}

export function OrgPanel() {
  const { org, permissions } = useAuth();

  const branding = org?.branding || {};
  const brandColor = branding.brand_color || branding.primary_color || '';
  const logoUrl = branding.logo_url || org?.logo_url || null;

  const granted = Object.entries(permissions || {})
    .filter(([, allowed]) => allowed)
    .map(([key]) => key.replace(/^can_/, '').replace(/_/g, ' '));

  return (
    <div>
      <h2 className="text-[16px] font-semibold text-text-primary">Organisation</h2>
      <p className="mt-1 max-w-[70ch] text-[13.5px] leading-[19px] text-text-secondary">
        Details for the workspace you&apos;re signed in to.
      </p>

      <div className="mt-5 flex items-center gap-4 rounded-[10px] border border-border-subtle bg-surface p-5">
        <div className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-border-default bg-surface-muted">
          {logoUrl
            ? <img src={logoUrl} alt={org?.name} className="h-full w-full object-cover" />
            : <span className="text-[15px] font-bold text-text-secondary">
                {(org?.name || '?').slice(0, 2).toUpperCase()}
              </span>}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-text-primary">
            {org?.name || 'Unnamed organisation'}
          </p>
          <p className="mt-0.5 text-[12.5px] text-text-secondary">
            {org?.is_onboarded ? 'Setup complete' : 'Setup incomplete'}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[10px] border border-border-subtle bg-surface px-5 py-1">
        <Row label="Name" value={org?.name} />
        <Row label="Org ID" value={org?.org_id} mono />
        <Row
          label="Brand colour"
          value={brandColor && (
            <span className="inline-flex items-center gap-2">
              <span
                className="h-[15px] w-[15px] flex-shrink-0 rounded-[4px] border border-border-default"
                style={{ backgroundColor: brandColor }}
              />
              <span className="font-mono text-[12.5px]">{brandColor}</span>
            </span>
          )}
        />
        <Row
          label="Your permissions"
          value={granted.length ? granted.join(', ') : null}
        />
      </div>

      <p className="mt-3 text-[12.5px] leading-[17px] text-text-secondary">
        Branding and organisation details are set during onboarding. Editing
        them here isn&apos;t available yet.
      </p>
    </div>
  );
}
