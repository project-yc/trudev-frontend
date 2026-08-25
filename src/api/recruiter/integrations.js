// ATS integrations API.
//
// Endpoint contract (backend: venaka/core/integrations/urls.py):
//   GET    /api/v1/recruiter/integrations
//   POST   /api/v1/recruiter/integrations                        { provider, api_key, settings? }
//   GET    /api/v1/recruiter/integrations/:id
//   PATCH  /api/v1/recruiter/integrations/:id                    { api_key? | settings? | enabled? }
//   DELETE /api/v1/recruiter/integrations/:id
//   POST   /api/v1/recruiter/integrations/:id/rotate-key
//   POST   /api/v1/recruiter/integrations/:id/test
//
// The key TruDev issues (`inbound_key`) is returned by connect and rotate-key
// and by nothing else — the server stores only a hash. Callers must surface it
// immediately; there is no way to fetch it again.

import { authAxios } from '../../lib/axios';

const BASE = '/api/v1/recruiter/integrations';

export const listIntegrations = async () => authAxios.get(BASE);

export const getIntegration = async (connectionId) =>
  authAxios.get(`${BASE}/${connectionId}`);

export const connectIntegration = async ({ provider, apiKey, settings }) =>
  authAxios.post(BASE, {
    provider,
    api_key: apiKey,
    ...(settings ? { settings } : {}),
  });

export const updateIntegrationCredential = async (connectionId, apiKey) =>
  authAxios.patch(`${BASE}/${connectionId}`, { api_key: apiKey });

export const updateIntegrationSettings = async (connectionId, settings) =>
  authAxios.patch(`${BASE}/${connectionId}`, { settings });

export const setIntegrationEnabled = async (connectionId, enabled) =>
  authAxios.patch(`${BASE}/${connectionId}`, { enabled });

export const disconnectIntegration = async (connectionId) =>
  authAxios.delete(`${BASE}/${connectionId}`);

export const rotateIntegrationKey = async (connectionId) =>
  authAxios.post(`${BASE}/${connectionId}/rotate-key`);

export const testIntegration = async (connectionId) =>
  authAxios.post(`${BASE}/${connectionId}/test`);

// Provider display metadata. Kept client-side because it is presentation —
// the setup steps and docs link are what the recruiter needs on screen, and
// the server has no business carrying copy.
export const PROVIDERS = {
  ashby: {
    label: 'Ashby',
    // Where the customer pastes our key. Shown as the last setup step.
    setupPath: 'Admin → Integrations → Assessments → TruDev',
    docsUrl: 'https://developers.ashbyhq.com/docs/creating-an-assessments-integration',
    credentialLabel: 'Ashby API key',
    credentialHint:
      'Create one in Ashby under Admin → API Keys, with Candidates write access.',
  },
};

export const STATUS_LABELS = {
  pending: 'Awaiting first request',
  active: 'Connected',
  disabled: 'Paused',
};
