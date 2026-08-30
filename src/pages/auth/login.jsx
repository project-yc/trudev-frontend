import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import GoogleAuthButton from '../../components/auth/GoogleAuthButton';
import loginBg from '../../assets/images/login_bg.svg';
import truDevLogo from '../../assets/icons/trudev_logo.svg';

// ─── API helpers ─────────────────────────────────────────────────────────────
async function doLogin(email, password) {
  const res  = await fetch('/api/auth/v1/recruiter/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.message || data.error || `Error ${res.status}`);
  return data;
}

// How long the success banner shows before redirecting. Preserved from the
// original implementation — this is a deliberate UX beat, not an accident.
const REDIRECT_DELAY_MS = 900;

// storeAuthData and resolveRedirect used to be defined here, in signup.jsx, in
// AdminLoginPage.jsx, and in an orphaned utils/authSession.js — four copies
// that had already drifted apart. See audit L1.
function resolveRedirect(userRole, org) {
  if (userRole === 'ORG_ADMIN' || userRole === 'ADMIN') {
    if (org?.org_id) return org.is_onboarded === false ? '/recruiter/onboarding' : '/recruiter/dashboard';
    if (userRole === 'ADMIN') return '/admin';
    return '/recruiter/onboarding';
  }
  if (userRole === 'RECRUITER') return '/recruiter/dashboard';
  return '/user/dashboard';
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function EyeIcon({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 10c1.9-4 5-6 8.5-6s6.6 2 8.5 6c-1.9 4-5 6-8.5 6s-6.6-2-8.5-6z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
}

function EyeSlashIcon({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="18" y2="18" />
      <path d="M8 4.4A9 9 0 0 1 10 4.2c3.5 0 6.6 2 8.5 6a14.6 14.6 0 0 1-2 3M4.3 5.7C2.7 6.9 1.5 8.3 1.5 10.2c1.9 4 5 6 8.5 6a9 9 0 0 0 4.9-1.6" />
      <path d="M7 8.5a2.5 2.5 0 0 0 4 3" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.75 2.99-4.32 2.99-7.31z" />
      <path fill="#34A853" d="M10 20c2.7 0 4.96-.89 6.62-2.41l-3.23-2.5c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H1.06v2.59A10 10 0 0 0 10 20z" />
      <path fill="#FBBC05" d="M4.41 11.93A6.02 6.02 0 0 1 4.09 10c0-.67.11-1.32.32-1.93V5.48H1.06A10 10 0 0 0 0 10c0 1.61.39 3.14 1.06 4.52l3.35-2.59z" />
      <path fill="#EA4335" d="M10 3.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87C14.95.99 12.7 0 10 0 6.09 0 2.7 2.24 1.06 5.48l3.35 2.59C5.2 5.72 7.4 3.96 10 3.96z" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  // Shared by the password and Google paths. Keeps the original brief success
  // banner before redirecting — only the mechanism changed, from a full page
  // reload (`window.location.href`) to in-app routing, so the session the auth
  // context just stored survives the transition.
  const completeLogin = (data) => {
    login(data);
    setError('');
    setSuccess('Login successful! Redirecting…');
    setTimeout(() => {
      navigate(resolveRedirect(data.role, data.org), { replace: true });
    }, REDIRECT_DELAY_MS);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Email and password are required.'); return; }
    setError(''); setSuccess(''); setLoading(true);
    try {
      completeLogin(await doLogin(email, password));
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (data) => completeLogin(data);

  return (
    <div
      className="h-[100dvh] w-full flex overflow-hidden bg-white p-0 md:p-4 lg:p-3 xl:p-4"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Left panel — image background */}
      <div
        className="hidden md:block md:w-[42%] lg:w-[40%] xl:w-[44%] shrink-0 rounded-2xl bg-cover bg-center"
        style={{ backgroundImage: `url(${loginBg})` }}
      />

      {/* Right panel */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto px-6 py-[clamp(12px,3vh,64px)] sm:px-10 xl:px-16">
        <div className="w-full max-w-[371px] flex flex-col items-center">

          {/* Logo */}
          <div className="flex items-center mb-20 ">
            <img src={truDevLogo} alt="" className="h-6 w-6" />
            <span className="font-wordmark text-[clamp(16px,2.6vh,22px)] font-medium leading-6 text-[#121212]">TruDev</span>
          </div>

          {/* Heading */}
          <div className="flex flex-col items-center gap-[clamp(4px,1vh,12px)] text-center mb-[clamp(12px,4vh,40px)] w-full">
            <h1
              className="text-[clamp(24px,6vh,48px)] leading-[1.05] tracking-[-0.05em] xl:tracking-[-0.07em] text-[#121212] font-medium"
              style={{ fontFamily: "'Noto Serif Display', serif" }}
            >
              Welcome Back
            </h1>
            <p className="text-[clamp(12px,1.8vh,16px)] leading-6 text-[#3d3d3d]">
              Enter your email and password to access your account
            </p>
          </div>

            {/* Status banners */}
            {error && (
              <div className="w-full mb-4 rounded-lg border border-error-border bg-error-bg px-3 py-2 text-[13px] leading-relaxed text-error">
                {error}
              </div>
            )}
            {success && (
              <div className="w-full mb-4 rounded-lg border border-success-border bg-success-bg px-3 py-2 text-[13px] leading-relaxed text-success">
                {success}
              </div>
            )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-[clamp(12px,3.5vh,40px)]">
            <div className="flex flex-col gap-[clamp(10px,2.2vh,24px)]">

              {/* Email */}
              <div className="flex flex-col gap-[clamp(4px,0.8vh,8px)]">
                <Label htmlFor="email" className="text-[clamp(12px,1.8vh,16px)] font-normal leading-6 text-[#121212]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                  className="h-[clamp(36px,6vh,50px)] rounded-xl border-none bg-[#f5f7fa] px-4 py-3.5 text-[14px] text-[#121212] placeholder:text-[#6b6b6b] focus-visible:ring-2 focus-visible:ring-[#121212]/15"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-[clamp(6px,1.2vh,12px)]">
                <div className="flex flex-col gap-[clamp(4px,0.8vh,8px)]">
                  <Label htmlFor="password" className="text-[clamp(12px,1.8vh,16px)] font-normal leading-6 text-[#121212]">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className="h-[clamp(36px,6vh,50px)] rounded-xl border-none bg-[#f5f7fa] px-4 py-3.5 pr-11 text-[14px] text-[#121212] placeholder:text-[#6b6b6b] focus-visible:ring-2 focus-visible:ring-[#121212]/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      tabIndex={-1}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b6b6b] hover:text-[#121212]"
                    >
                      {showPw ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between w-full">
                  <label className="flex items-center gap-1.5 text-[clamp(11px,1.6vh,14px)] leading-5 text-[#3d3d3d] font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="size-[15.75px] rounded-[4.5px] border border-[#ccc] accent-[#121212]"
                    />
                    Remember me
                  </label>
                  <a href="/forgot-password" className="text-[clamp(11px,1.6vh,14px)] leading-5 text-[#3d3d3d] font-medium hover:text-[#121212]">
                    Forgot Password
                  </a>
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="h-auto w-full rounded-xl bg-[#121212] px-4 py-[clamp(8px,1.4vh,12px)] text-[clamp(13px,1.8vh,16px)] font-bold text-white hover:bg-[#2b2b2b] disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center w-full py-[clamp(8px,2vh,24px)]">
            <div className="flex-1 h-px bg-[#f3f4f6]" />
            <span className="px-4 text-[12px] leading-4 text-[#9ca3af]">or continue with</span>
            <div className="flex-1 h-px bg-[#f3f4f6]" />
          </div>

          {/* Google */}
          <GoogleAuthButton className="w-full" onSuccess={handleGoogleSuccess} onError={setError}>
            <button
              type="button"
              tabIndex={-1}
              className="h-[clamp(36px,5.6vh,48px)] w-full rounded-xl border border-[#ededed] bg-white px-4 py-3 text-[clamp(13px,1.8vh,16px)] font-medium text-[#121212] group-hover:bg-[#f9f9f9] flex items-center justify-center gap-2.5"
            >
              <GoogleIcon />
              Sign In with Google
            </button>
          </GoogleAuthButton>

          {/* Signup CTA */}
          <p className="mt-[clamp(12px,3vh,32px)] text-[clamp(12px,1.8vh,16px)] leading-6 text-[#3e3e3e]">
            Don&rsquo;t have an account?{' '}
            <Link to="/recruiter/signup" className="font-medium text-[#121212] hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
