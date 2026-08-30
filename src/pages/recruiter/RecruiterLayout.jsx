// RecruiterLayout — persistent sidebar shell for all recruiter screens.
// Uses semantic theme tokens (see src/theme/) so colors stay consistent
// across the app and respond to the active org's brand color.
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronRight, FileText, GitBranch, LayoutDashboard,
  Library, ListChecks, Menu, PanelLeftClose, PanelLeftOpen, Plus,
  LogOut, Search, Settings, Star, User, UserPlus, X,
} from 'lucide-react';
import { RecruiterThemeProvider } from '../../theme/RecruiterThemeProvider.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Toaster } from '../../components/ui/sonner';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../auth/authContext';
import { ROLE_LABELS } from '../../constants/roles';
import { resendVerificationEmail } from '../../lib/emailVerification';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { icon: Search, label: 'Search', type: 'button' },
      { to: '/recruiter/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Hiring',
    items: [
      { to: '/recruiter/assessments', icon: FileText, label: 'Assessments' },
      { to: '/recruiter/candidates', icon: User, label: 'Candidates' },
      { to: '/recruiter/pipeline', icon: GitBranch, label: 'Pipeline' },
      { to: '/recruiter/reports', icon: Star, label: 'Reviews' },
    ],
  },
  {
    label: 'Library',
    items: [
      { to: '/recruiter/task-library', icon: ListChecks, label: 'Task library' },
      { to: '/recruiter/templates', icon: Library, label: 'Templates' },
    ],
  },
  {
    label: 'Team',
    items: [
      { to: '/recruiter/invite', icon: UserPlus, label: 'Invite' },
    ],
  },
];

function LayoutShell({ children }) {
  const navigate = useNavigate();
  const { role: sessionRole, logout, user: authUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [resending, setResending] = useState(false);
  const showVerifyBanner = authUser?.email_verified === false;

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const org  = (() => { try { return JSON.parse(localStorage.getItem('org')  || '{}'); } catch { return {}; } })();

  const orgName  = org?.name || 'TruDev';
  const logoUrl  = org?.branding?.logo_url || org?.logo_url || null;
  const userName = user?.full_name || user?.name || user?.email || 'Recruiter';
  const avatarUrl = user?.avatar_url || user?.profile_image || user?.photo_url || null;
  const initials = userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  // The context is the authority (it re-reads /me), but it is empty on the
  // first paint after a reload — localStorage covers that gap so the role
  // does not flicker in.
  const roleKey = sessionRole || localStorage.getItem('userRole') || '';
  const roleLabel = ROLE_LABELS[roleKey] || 'Member';

  const goToSettings = () => {
    setAccountOpen(false);
    setMobileOpen(false);
    navigate('/recruiter/settings');
  };

  const handleResend = async () => {
    setResending(true);
    await resendVerificationEmail();
    setResending(false);
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-page">
      <div className={`h-[60px] flex items-center px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'}`}>
          <div className="w-7 h-7 rounded-[7px] bg-[var(--color-sidebar-control)] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {logoUrl && <img src={logoUrl} alt={orgName} className="w-full h-full object-cover" />}
          </div>
          {!collapsed && <p className="text-[13px] leading-none font-bold text-text-primary truncate">{orgName}</p>}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="w-5 h-5 rounded-[6px] flex items-center justify-center text-brand-navy hover:bg-brand-tint transition-colors"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-5 h-5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div
        className={`mx-3 mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl ${collapsed ? 'px-2 py-3' : 'px-[11px] pt-[10px] pb-[14px]'}`}
        style={{ background: 'linear-gradient(180deg, var(--color-sidebar-bg-top) 0%, var(--color-sidebar-bg-mid) 38%, var(--color-sidebar-bg-bottom) 100%)' }}
      >
        {!collapsed && (
          <button
            onClick={() => navigate('/recruiter/assessments/new')}
            className="mb-[18px] flex h-[39px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-sidebar-control)] px-3 text-[13px] font-semibold text-[var(--color-sidebar-control-text)] shadow-[0_12px_26px_var(--color-sidebar-shadow)] transition-colors hover:bg-[var(--color-sidebar-control-hover)]"
          >
            <Plus className="w-4 h-4" strokeWidth={1.8} />
            Create assignment
          </button>
        )}

        <nav className="flex-1 overflow-y-auto">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className={collapsed ? 'mb-2' : 'mb-[19px]'}>
              {!collapsed && (
                <p className="mb-[9px] text-[12px] leading-none font-semibold uppercase text-[var(--color-sidebar-muted)]">
                  {group.label}
                </p>
              )}
              <div className="space-y-[3px]">
                {group.items.map((item) => {
                  const IconComponent = item.icon;
                  const baseClass = `flex h-[34px] w-full items-center rounded-[7px] text-[13px] font-semibold transition-colors ${
                    collapsed
                      ? 'justify-center px-0'
                      : 'gap-[13px] px-[10px]'
                  }`;

                  if (item.type === 'button') {
                    return (
                      <button
                        key={`${group.label}-${item.label}`}
                        type="button"
                        className={`${baseClass} text-[var(--color-sidebar-text)] hover:bg-white/15`}
                        title={collapsed ? item.label : undefined}
                      >
                        <IconComponent className="w-[17px] h-[17px] flex-shrink-0 text-current" strokeWidth={1.8} />
                        {!collapsed && <span>{item.label}</span>}
                      </button>
                    );
                  }

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `${baseClass} ${
                          isActive
                            ? 'bg-[var(--color-sidebar-active)] text-black shadow-[0_10px_22px_rgba(15,23,42,0.18)]'
                            : 'text-[var(--color-sidebar-text)] hover:bg-white/15'
                        }`
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <IconComponent className="w-[17px] h-[17px] flex-shrink-0 text-current" strokeWidth={1.8} />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {!collapsed && (
          <Popover open={accountOpen} onOpenChange={setAccountOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                className="mt-auto flex h-[50px] w-full items-center gap-[10px] rounded-[10px] border border-[var(--color-sidebar-stroke)] bg-surface px-[10px] text-left shadow-[0_8px_24px_var(--color-sidebar-shadow)] transition-colors hover:bg-surface-hover focus-visible:!outline-none"
              >
                <div className="w-[34px] h-[34px] rounded-full bg-surface-muted border border-[var(--color-sidebar-stroke)] flex items-center justify-center overflow-hidden text-[11px] font-bold text-[var(--color-sidebar-muted)] flex-shrink-0">
                  {avatarUrl
                    ? <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                    : initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-[16px] font-semibold text-text-primary truncate">{userName}</p>
                  <p className="text-[10px] leading-[13px] font-semibold uppercase tracking-[0.07em] text-[var(--color-sidebar-muted)] truncate">
                    {roleLabel}
                  </p>
                </div>
                <ChevronRight
                  className={`w-[18px] h-[18px] text-text-primary flex-shrink-0 transition-transform ${accountOpen ? '-rotate-90' : ''}`}
                  strokeWidth={2.4}
                />
              </button>
            </PopoverTrigger>

            {/* Opens upward: the card sits at the bottom of the sidebar, so a
                downward menu would be clipped by the viewport edge. */}
            <PopoverContent
              side="top"
              align="start"
              sideOffset={8}
              className="w-[var(--radix-popover-trigger-width)] min-w-[190px] p-1.5"
            >
              <button
                type="button"
                onClick={goToSettings}
                className="flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-muted focus-visible:!outline-none"
              >
                <Settings className="h-[15px] w-[15px] text-text-secondary" strokeWidth={1.8} />
                Settings
              </button>
              <button
                type="button"
                onClick={() => { setAccountOpen(false); logout(); }}
                className="flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-[13px] font-medium text-error transition-colors hover:bg-error-bg focus-visible:!outline-none"
              >
                <LogOut className="h-[15px] w-[15px]" strokeWidth={1.8} />
                Log out
              </button>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-page font-sans antialiased overflow-hidden text-text-primary">

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col bg-surface flex-shrink-0 transition-all duration-200 ${collapsed ? 'w-[58px]' : 'w-[228px]'}`}>
        {renderSidebarContent()}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute top-[22px] left-[44px] z-10 w-5 h-5 rounded-[6px] border border-brand-navy bg-surface flex items-center justify-center text-brand-navy hover:bg-brand-tint transition-colors"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        )}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-text-primary/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[228px] bg-surface z-10">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-3 p-1.5 text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 h-12 px-4 border-b border-border-default flex-shrink-0 bg-surface">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 text-text-muted hover:text-text-primary">
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-brand flex items-center justify-center">
              <span className="w-full h-full rounded bg-[var(--color-sidebar-control)]" />
            </div>
            <span className="font-wordmark text-[12px] font-medium tracking-[0.01em] text-text-primary">Trudev</span>
          </div>
        </header>

        {showVerifyBanner && (
          <div className="flex flex-shrink-0 items-center justify-center gap-3 border-b border-warning-border bg-warning-bg px-4 py-2 text-[12.5px] text-warning">
            <span>Verify your email to unlock all features.</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-warning underline hover:bg-transparent hover:opacity-80"
              disabled={resending}
              onClick={handleResend}
            >
              {resending ? 'Sending…' : 'Resend link'}
            </Button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-page">
          {children}
        </main>
      </div>

      <Toaster />
    </div>
  );
}

export default function RecruiterLayout({ children }) {
  return (
    <RecruiterThemeProvider>
      <LayoutShell>{children}</LayoutShell>
    </RecruiterThemeProvider>
  );
}
