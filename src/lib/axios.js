import axios from 'axios';
import { toast } from 'sonner';

import { forceLogout, getAccessToken, refreshAccessToken } from './session';

// Dynamic import (not a static one) to avoid a require cycle: emailVerification.js
// imports `authAxios` from this file.
const resendVerification = () => import('./emailVerification').then((m) => m.resendVerificationEmail());

const authAxios = axios.create({
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: inject Authorization header ───────────────────────────
authAxios.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let axios auto-set Content-Type for FormData (don't override)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// ── Error message extractor ───────────────────────────────────────────────────
function extractErrorMessage(error) {
  if (error.response?.data) {
    const d = error.response.data;
    return d.message || d.detail || d.error || `HTTP Error: ${error.response.status}`;
  }
  return error.message || `HTTP Error: ${error.response?.status || 'Network Error'}`;
}

// ── Response interceptor ──────────────────────────────────────────────────────
//
// Refresh is delegated to lib/session, which owns the single-flight lock and
// persists rotated refresh tokens. This file used to run its own refresh with
// its own lock — see docs/audits/01-account-creation-auth.md (L5).
authAxios.interceptors.response.use(
  (response) => {
    if (response.status === 204) return {};
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Blocked by the email-verification gate — surface it once, everywhere,
    // instead of every caller needing its own 403 handling.
    if (error.response?.data?.code === 'email_not_verified') {
      toast.error('Verify your email to continue', {
        description: 'Check your inbox for the verification link, or resend it below.',
        action: { label: 'Resend email', onClick: resendVerification },
      });
    }

    // Not a 401, or we already retried this one — normalise and throw
    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      throw new Error(extractErrorMessage(error));
    }

    originalRequest._retry = true;

    const newToken = await refreshAccessToken();
    if (!newToken) {
      forceLogout();
      throw new Error(extractErrorMessage(error));
    }

    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return authAxios(originalRequest);
  },
);

export { authAxios, forceLogout };
