import { useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  KeyRound,
  Loader,
  Pause,
  Play,
  Plug,
  Trash2,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../lib/utils';
import { PROVIDERS, STATUS_LABELS } from '../../../../api/recruiter/integrations';

const STATUS_TONE = {
  active: 'bg-success-bg text-success border-success-border',
  pending: 'bg-warning-bg text-warning border-warning-border',
  disabled: 'bg-surface-muted text-text-secondary border-border-default',
};

function formatWhen(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <div className="mt-1 truncate text-[13px] text-text-primary">{children}</div>
    </div>
  );
}

/**
 * One ATS, connected or not.
 *
 * The endpoint URL is surfaced prominently rather than buried in docs: it is
 * the other half of what the customer must paste into their ATS, and an
 * integration that has the key but not the URL fails in a way that looks
 * identical to a bad key.
 */
export function IntegrationCard({
  provider,
  connection,
  baseUrl,
  onConnect,
  onTest,
  onRotate,
  onToggle,
  onDisconnect,
  busy,
}) {
  const [copied, setCopied] = useState(false);
  const meta = PROVIDERS[provider] || { label: provider };
  const endpointUrl = `${baseUrl}/api/v1/ats/${provider}`;

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(endpointUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!connection) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-[10px] border border-border-subtle bg-surface p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Plug className="h-[16px] w-[16px] text-text-secondary" strokeWidth={1.8} />
            <h3 className="text-[15px] font-semibold text-text-primary">{meta.label}</h3>
          </div>
          <p className="mt-1 text-[13px] leading-[18px] text-text-secondary">
            Send TruDev assessments from {meta.label} and get scores back on the
            candidate&apos;s profile.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => onConnect(provider)}
          className="h-[38px] flex-shrink-0 px-4 text-[13px]"
        >
          Connect
        </Button>
      </div>
    );
  }

  const status = connection.status;
  const isDisabled = status === 'disabled';

  return (
    <div className="rounded-[10px] border border-border-subtle bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold text-text-primary">
              {connection.provider_label || meta.label}
            </h3>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                STATUS_TONE[status] || STATUS_TONE.disabled,
              )}
            >
              {STATUS_LABELS[status] || status}
            </span>
          </div>
          {status === 'pending' && (
            <p className="mt-1.5 text-[13px] leading-[18px] text-text-secondary">
              Waiting for {meta.label} to make its first call. Finish setup in{' '}
              <span className="font-medium text-text-primary">{meta.setupPath}</span>.
            </p>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onTest(connection)}
            disabled={busy}
            className="h-[34px] px-3 text-[12.5px]"
          >
            Test
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onRotate(connection)}
            disabled={busy}
            className="h-[34px] gap-1.5 px-3 text-[12.5px]"
          >
            <KeyRound className="h-[13px] w-[13px]" />
            New key
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onToggle(connection, isDisabled)}
            disabled={busy}
            className="h-[34px] gap-1.5 px-3 text-[12.5px]"
          >
            {isDisabled ? <Play className="h-[13px] w-[13px]" /> : <Pause className="h-[13px] w-[13px]" />}
            {isDisabled ? 'Resume' : 'Pause'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onDisconnect(connection)}
            disabled={busy}
            className="h-[34px] gap-1.5 px-3 text-[12.5px] text-error hover:bg-error-bg hover:text-error"
          >
            <Trash2 className="h-[13px] w-[13px]" />
            Disconnect
          </Button>
        </div>
      </div>

      {connection.last_error && (
        <div className="mt-4 flex items-start gap-2 rounded-[8px] border border-error-border bg-error-bg px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-[14px] w-[14px] flex-shrink-0 text-error" />
          <div className="min-w-0">
            <p className="text-[13px] text-error">{connection.last_error}</p>
            <p className="mt-0.5 text-[12px] text-text-secondary">
              {formatWhen(connection.last_error_at)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border-subtle pt-4 lg:grid-cols-4">
        <Field label="Your TruDev key">
          <span className="font-mono text-[12.5px]">{connection.inbound_key_preview || '—'}</span>
        </Field>
        <Field label={`${meta.label} key`}>
          <span className="font-mono text-[12.5px]">
            {connection.outbound_credential_preview || '—'}
          </span>
        </Field>
        <Field label="Last received">{formatWhen(connection.last_inbound_at)}</Field>
        <Field label="Last sent">{formatWhen(connection.last_outbound_at)}</Field>
      </div>

      <div className="mt-4 border-t border-border-subtle pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Endpoint URL for {meta.label}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <code className="min-w-0 flex-1 select-all overflow-x-auto rounded-[8px] border border-border-default bg-surface-muted px-3 py-2 font-mono text-[12.5px] text-text-primary">
            {endpointUrl}
          </code>
          <Button
            type="button"
            variant="secondary"
            onClick={copyEndpoint}
            className="h-[36px] flex-shrink-0 gap-1.5 px-3 text-[12.5px]"
          >
            {copied ? <Check className="h-[13px] w-[13px]" /> : <Copy className="h-[13px] w-[13px]" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      {busy && (
        <div className="mt-3 flex items-center gap-2 text-[12.5px] text-text-secondary">
          <Loader className="h-[13px] w-[13px] animate-spin" />
          Working…
        </div>
      )}
    </div>
  );
}
