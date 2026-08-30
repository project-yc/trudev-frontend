import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecruiterThemeProvider } from '../../theme/RecruiterThemeProvider';
import { useAuth } from '../../auth/authContext';

async function doAdminLogin(email, password) {
  const res = await fetch('/api/auth/v1/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.message || `Error ${res.status}`);
  return data;
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await doAdminLogin(email, password);
      // Check the role BEFORE persisting anything. This used to store the
      // tokens first and then show an error, leaving a rejected user holding a
      // valid half-signed-in session. See audit M9.
      if (data.role !== 'ADMIN') {
        setError('This account does not have platform admin access.');
        return;
      }
      login(data);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <RecruiterThemeProvider>
      <div className="min-h-screen bg-page flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* Logo / wordmark */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-on-brand">
                  <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor" />
                  <rect x="9" y="2" width="5" height="5" rx="1" fill="currentColor" opacity="0.6" />
                  <rect x="2" y="9" width="5" height="5" rx="1" fill="currentColor" opacity="0.6" />
                  <rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor" />
                </svg>
              </div>
              <span className="font-wordmark text-lg font-medium text-text-primary tracking-tight">TruDev</span>
            </div>
            <p className="text-xs text-text-muted uppercase tracking-widest font-medium">
              Platform Admin
            </p>
          </div>

          {/* Card */}
          <div className="bg-surface border border-border-default rounded-xl p-6 shadow-sm">
            <h1 className="text-base font-semibold text-text-primary mb-1">Sign in</h1>
            <p className="text-sm text-text-muted mb-5">Restricted access — authorized personnel only.</p>

            {error && (
              <div className="mb-4 px-3 py-2.5 rounded-lg bg-error-bg border border-error-border text-error text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@trudev.io"
                  className="w-full px-3 py-2 rounded-lg border border-border-default bg-page text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-9 rounded-lg border border-border-default bg-page text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5" />
                        <path d="M9.9 3.5A7.5 7.5 0 0 0 8 3C4.1 3 1 8 1 8s.9 1.7 2.5 3.1" />
                        <path d="M5.5 4.6C6.3 4.2 7.1 4 8 4c3.9 0 7 4 7 4s-1.3 2.4-3.5 3.7" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" />
                        <circle cx="8" cy="8" r="2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg bg-brand text-on-brand text-sm font-medium hover:bg-brand-hover active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </RecruiterThemeProvider>
  );
}
