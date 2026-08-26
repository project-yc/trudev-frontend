// Profile tab — the signed-in user's own account.
//
// Read-only, deliberately. `/api/auth/v1/me` is the only endpoint behind this
// and it is GET-only; there is no profile-update route on the backend yet.
// Rendering editable inputs that silently discard changes would be worse than
// showing the truth, so the fields are presented as values and the panel says
// where to go instead.
import { useAuth } from '../../../../auth/authContext';
import { ROLE_LABELS } from '../../../../constants/roles';

function Row({ label, value, mono }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border-subtle py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <p className="w-[150px] flex-shrink-0 text-[13px] text-text-secondary">{label}</p>
      <p className={`min-w-0 break-words text-[13.5px] text-text-primary ${mono ? 'font-mono text-[12.5px]' : ''}`}>
        {value || <span className="text-text-muted">Not set</span>}
      </p>
    </div>
  );
}

export function ProfilePanel() {
  const { user, role } = useAuth();

  const name = user?.name || user?.full_name || '';
  const avatarUrl = user?.avatar_url || user?.profile_image || null;
  const initials = (name || user?.email || '?')
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div>
      <h2 className="text-[16px] font-semibold text-text-primary">Profile</h2>
      <p className="mt-1 max-w-[70ch] text-[13.5px] leading-[19px] text-text-secondary">
        Your account details, as your organisation sees them.
      </p>

      <div className="mt-5 flex items-center gap-4 rounded-[10px] border border-border-subtle bg-surface p-5">
        <div className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-default bg-surface-muted text-[15px] font-bold text-text-secondary">
          {avatarUrl
            ? <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
            : initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-text-primary">
            {name || 'Unnamed user'}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-text-muted">
            {ROLE_LABELS[role] || 'Member'}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[10px] border border-border-subtle bg-surface px-5 py-1">
        <Row label="Name" value={name} />
        <Row label="Email" value={user?.email} />
        <Row label="Role" value={ROLE_LABELS[role] || role} />
        <Row label="User ID" value={user?.id} mono />
      </div>

      <p className="mt-3 text-[12.5px] leading-[17px] text-text-secondary">
        Editing your name or avatar isn&apos;t available yet — ask an org admin
        to update your details, or contact support.
      </p>
    </div>
  );
}
