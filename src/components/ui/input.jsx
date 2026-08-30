import * as React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      // No colored ring on focus — same treatment SelectTrigger already uses, so
      // the three form primitives read as one family. The ring was
      // `ring-brand/25`, and `--color-brand` is the ORG's colour at runtime
      // (RecruiterThemeProvider), so on a blue-branded org every field in the
      // builder lit up blue the moment it was clicked. `!outline-none` is
      // important because src/index.css declares a global
      // `*:focus-visible { outline: 2px solid var(--color-brand) }` later in the
      // stylesheet, which beats an unqualified `outline-none` on specificity.
      // The border no longer changes on focus — a field that darkens its own
      // outline the moment you click into it reads as an error state, and it
      // made every form look busy while being typed in. The halo carries focus
      // on its own now.
      //
      // The halo is also warm rather than `slate-900/[0.07]`: slate is a blue
      // grey, so on the cream page background it landed as a faint blue wash
      // that fought the ember palette. `#1C1410` is the same near-black used
      // for scrims elsewhere, so the halo now reads as shadow, not colour.
      //
      // Kept rather than removed entirely because it is the only remaining
      // focus indicator: with `!outline-none` above suppressing the global
      // ring, dropping this too would leave keyboard users with no visible
      // focus at all.
      'flex h-[42px] w-full rounded-[8px] border border-border-default bg-surface px-3 py-2 text-[14px] leading-none text-text-primary shadow-sm transition-shadow placeholder:text-text-muted !outline-none focus:ring-[3px] focus:ring-[#1C1410]/[0.07] disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
