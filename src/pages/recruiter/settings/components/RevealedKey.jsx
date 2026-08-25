import { useState } from 'react';
import { Check, Copy, TriangleAlert } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

/**
 * The one-time display of a newly issued TruDev key.
 *
 * The server keeps only a hash, so this is genuinely the only moment the key
 * exists anywhere the user can reach. That constraint drives every choice
 * here: the warning is stated before the key rather than under it, the value
 * is selectable as well as copyable (a failed clipboard write must not lose
 * it), and there is no dismiss control — the parent clears it only after the
 * user has had a chance to copy.
 */
export function RevealedKey({ value, provider }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked by permissions or a non-secure origin. The
      // key is still on screen and selectable, so this is recoverable —
      // saying so beats a silent no-op.
      setCopied(false);
    }
  };

  return (
    <div className="rounded-[10px] border border-warning-border bg-warning-bg p-4">
      <div className="flex items-start gap-2.5">
        <TriangleAlert className="mt-0.5 h-[16px] w-[16px] flex-shrink-0 text-warning" strokeWidth={2} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-text-primary">
            Copy this key now
          </p>
          <p className="mt-1 text-[13px] leading-[18px] text-text-secondary">
            This is the only time it will be shown. Paste it into {provider} to
            finish connecting. If you lose it, issue a new one — you will not be
            able to retrieve this one.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 select-all overflow-x-auto rounded-[8px] border border-border-default bg-surface px-3 py-2 font-mono text-[12.5px] text-text-primary">
              {value}
            </code>
            <Button
              type="button"
              variant="secondary"
              onClick={copy}
              className="h-[38px] flex-shrink-0 gap-1.5 px-3 text-[13px]"
            >
              {copied ? (
                <>
                  <Check className="h-[14px] w-[14px]" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-[14px] w-[14px]" /> Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
