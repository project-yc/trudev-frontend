import { toast } from 'sonner';

import { authAxios } from './axios';

/** Shared by the blocked-action toast, the persistent banner, and Settings. */
export async function resendVerificationEmail() {
  try {
    await authAxios.post('/api/auth/v1/resend-verification');
    toast.success('Verification email sent.');
  } catch (err) {
    toast.error(err.message || 'Could not send the email. Try again shortly.');
  }
}
