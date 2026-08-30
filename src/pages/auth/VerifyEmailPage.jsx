import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../auth/authContext';
import AuthShell, { buttonClass } from './AuthShell';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { isAuthenticated, revalidate } = useAuth();

  const [status, setStatus] = useState(token ? 'verifying' : 'missing');
  const [error, setError] = useState('');
  const ranRef = useRef(false);

  useEffect(() => {
    if (!token || ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const res = await fetch('/api/auth/v1/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || 'Could not verify this email.');
        setStatus('verified');
        // Refresh the cached session so the banner/toast gate disappears
        // without a full reload, if the user is signed in on this device.
        if (isAuthenticated) revalidate();
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    })();
  }, [token, isAuthenticated, revalidate]);

  if (status === 'missing') {
    return (
      <AuthShell
        title="Link not valid"
        subtitle="This verification link is missing its token."
        footer={<Link to="/login" className="underline">Back to sign in</Link>}
      />
    );
  }

  if (status === 'verifying') {
    return <AuthShell title="Confirming your email…" />;
  }

  if (status === 'error') {
    return (
      <AuthShell
        title="Link not valid"
        subtitle={error}
        footer={<Link to="/login" className="underline">Back to sign in</Link>}
      />
    );
  }

  return (
    <AuthShell
      title="Email verified"
      subtitle="You're all set — every feature is unlocked."
    >
      <Link to={isAuthenticated ? '/recruiter/dashboard' : '/login'} className={`${buttonClass} block text-center`}>
        {isAuthenticated ? 'Go to dashboard' : 'Sign in'}
      </Link>
    </AuthShell>
  );
}
