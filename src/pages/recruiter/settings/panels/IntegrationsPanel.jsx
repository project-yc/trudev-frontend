// Integrations tab — connect and manage ATS providers.
//
// Lifted wholesale out of the settings page when tabs were introduced; the
// page is now just a shell, so all the connect/rotate/test state lives here
// with the UI it drives.
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';

import {
  connectIntegration,
  disconnectIntegration,
  listIntegrations,
  rotateIntegrationKey,
  setIntegrationEnabled,
  testIntegration,
} from '../../../../api/recruiter/integrations';
import { ConnectDialog } from '../components/ConnectDialog';
import { IntegrationCard } from '../components/IntegrationCard';
import { RevealedKey } from '../components/RevealedKey';

export function IntegrationsPanel() {
  const [connections, setConnections] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [connectProvider, setConnectProvider] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // The freshly issued key, held only in component state. Never persisted and
  // cleared on reload — there is nowhere safe to keep it, and the user has
  // been told to copy it now.
  const [revealed, setRevealed] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listIntegrations();
      const data = res.data || res;
      setConnections(data.connections || []);
      setProviders(data.available_providers || []);
    } catch (err) {
      setError(err?.message || 'Could not load integrations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const connectionFor = (provider) =>
    connections.find((item) => item.provider === provider) || null;

  const handleConnect = async (apiKey) => {
    setSubmitting(true);
    try {
      const res = await connectIntegration({ provider: connectProvider, apiKey });
      const data = res.data || res;
      setRevealed({ provider: connectProvider, key: data.inbound_key });
      setConnectProvider(null);
      await load();
      toast.success('Connected. Copy your key to finish setup.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTest = async (connection) => {
    setBusyId(connection.id);
    try {
      const res = await testIntegration(connection.id);
      const payload = res.data || res;
      if (payload?.ok) {
        toast.success('Connection is working.');
      } else {
        toast.error(payload?.error || 'Connection test failed.');
      }
    } catch (err) {
      toast.error(err?.message || 'Connection test failed.');
    } finally {
      setBusyId(null);
      load();
    }
  };

  const handleRotate = async (connection) => {
    // Destructive and not obviously so — the old key stops working the
    // instant this runs, which takes a working integration down until the
    // new one is pasted in.
    const confirmed = window.confirm(
      'Issue a new key?\n\nThe current key stops working immediately, and the '
        + 'integration will pause until you paste the new one into your ATS.',
    );
    if (!confirmed) return;

    setBusyId(connection.id);
    try {
      const res = await rotateIntegrationKey(connection.id);
      const data = res.data || res;
      setRevealed({ provider: connection.provider, key: data.inbound_key });
      await load();
    } catch (err) {
      toast.error(err?.message || 'Could not issue a new key.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggle = async (connection, enable) => {
    setBusyId(connection.id);
    try {
      await setIntegrationEnabled(connection.id, enable);
      await load();
      toast.success(enable ? 'Integration resumed.' : 'Integration paused.');
    } catch (err) {
      toast.error(err?.message || 'Could not update the integration.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDisconnect = async (connection) => {
    const confirmed = window.confirm(
      'Disconnect this integration?\n\nIn-progress assessments keep running, but '
        + 'their results will no longer reach your ATS.',
    );
    if (!confirmed) return;

    setBusyId(connection.id);
    try {
      await disconnectIntegration(connection.id);
      await load();
      toast.success('Integration disconnected.');
    } catch (err) {
      toast.error(err?.message || 'Could not disconnect.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h2 className="text-[16px] font-semibold text-text-primary">Integrations</h2>
      <p className="mt-1 max-w-[70ch] text-[13.5px] leading-[19px] text-text-secondary">
        Once connected, recruiters can add a TruDev assessment to an interview
        stage in your ATS. Candidates are invited automatically and scores
        appear on their profile.
      </p>

      {revealed && (
        <div className="mt-4">
          <RevealedKey
            value={revealed.key}
            provider={connectionFor(revealed.provider)?.provider_label || revealed.provider}
          />
          <button
            type="button"
            onClick={() => setRevealed(null)}
            className="mt-2 text-[13px] text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
          >
            I&apos;ve copied it
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-[8px] border border-error-border bg-error-bg px-4 py-3 text-[13px] text-error">
          <AlertCircle className="h-[15px] w-[15px]" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex h-[160px] items-center justify-center rounded-[10px] border border-border-subtle">
          <Loader className="h-[20px] w-[20px] animate-spin text-brand" />
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {providers.map((provider) => (
            <IntegrationCard
              key={provider}
              provider={provider}
              connection={connectionFor(provider)}
              baseUrl={window.location.origin}
              busy={busyId === connectionFor(provider)?.id}
              onConnect={setConnectProvider}
              onTest={handleTest}
              onRotate={handleRotate}
              onToggle={handleToggle}
              onDisconnect={handleDisconnect}
            />
          ))}
          {providers.length === 0 && (
            <p className="text-[13.5px] text-text-secondary">
              No integrations are available yet.
            </p>
          )}
        </div>
      )}

      <ConnectDialog
        provider={connectProvider}
        open={Boolean(connectProvider)}
        onOpenChange={(next) => !next && setConnectProvider(null)}
        onSubmit={handleConnect}
        submitting={submitting}
      />
    </div>
  );
}
