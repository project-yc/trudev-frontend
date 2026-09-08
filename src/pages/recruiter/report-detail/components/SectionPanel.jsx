import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../../lib/utils';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Right-side drawer shell shared by every section panel.
 * Figma: 622px wide, header row with title + circular close, hairline divider,
 * scrolling body.
 *
 * Content-agnostic on purpose — MCQ and AI Adaptive panels reuse this shell.
 */
export function SectionPanel({ open, title, subtitle, onClose, children }) {
  const dialogRef = useRef(null);
  const restoreFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // role=dialog: move focus into the drawer on open and hand it back to the
  // control that opened it on close. Keyboard and screen-reader users were
  // otherwise left on the page behind the overlay.
  useEffect(() => {
    if (!open) return undefined;
    restoreFocusRef.current = document.activeElement;
    // The wrapper animates `visibility` (invisible -> visible over 500ms) and
    // an element is not focusable while the computed value is still hidden —
    // which it is on the very frame the class flips. Retry each frame until
    // focus lands inside the dialog, bounded so a missing target cannot loop.
    const started = performance.now();
    let frame = 0;
    const attempt = () => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const first = dialog.querySelector(FOCUSABLE) || dialog;
      first.focus({ preventScroll: true });
      if (!dialog.contains(document.activeElement) && performance.now() - started < 800) {
        frame = window.requestAnimationFrame(attempt);
      }
    };
    frame = window.requestAnimationFrame(attempt);
    return () => {
      window.cancelAnimationFrame(frame);
      const previous = restoreFocusRef.current;
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
        previous.focus({ preventScroll: true });
      }
      restoreFocusRef.current = null;
    };
  }, [open]);

  return (
    <div className={cn('fixed inset-0 z-50 transition-[visibility] duration-500', open ? 'visible' : 'invisible')}>
      <button
        type="button"
        aria-label="Close panel"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-text-primary/45 transition-opacity duration-500 ease-out',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full max-w-[622px] flex-col border-l border-border-subtle bg-surface shadow-modal',
          'transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex h-[56px] flex-shrink-0 items-center justify-between border-b border-border-subtle px-[22px]">
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-bold leading-[20px] text-text-primary">{title}</h2>
            {subtitle && (
              <p className="truncate text-[12px] leading-[15px] text-text-muted">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full border border-border-default text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <X className="h-[14px] w-[14px]" strokeWidth={2} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-[22px] py-[20px]">{children}</div>
      </aside>
    </div>
  );
}

/** Consistent heading + spacing for the blocks inside a panel. */
export function PanelBlock({ title, action, children, className }) {
  return (
    <section className={cn('mt-[26px] first:mt-0', className)}>
      {(title || action) && (
        <div className="mb-[10px] flex items-center justify-between gap-3">
          {title && <h3 className="text-[15px] font-bold leading-[19px] text-text-primary">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** The error card every section panel shows when its slice failed to load. */
export function PanelError({ children }) {
  return (
    <PanelBlock>
      <div className="rounded-[10px] border border-error-border bg-error-bg px-[12px] py-[9px]">
        <p className="text-[12px] leading-[17px] text-error">{children}</p>
      </div>
    </PanelBlock>
  );
}

/**
 * Neutral "nothing here" state. Returning null from a panel renders an empty
 * drawer with nothing but a title, which reads as a broken panel rather than
 * an absent result.
 */
export function PanelEmpty({ children }) {
  return (
    <PanelBlock>
      <p className="text-[13px] leading-[20px] text-text-muted">{children}</p>
    </PanelBlock>
  );
}
