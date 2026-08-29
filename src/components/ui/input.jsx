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
      // Focus stays visible, and deliberately more than a shade on a 1px
      // border: the darkened border alone was `#E2E8F0` -> `#CBD5E1`, which is
      // not a focus indicator anyone can see. It is a neutral grey halo, so
      // keyboard focus is obvious without the field looking selected or errored.
      'flex h-[42px] w-full rounded-[8px] border border-border-default bg-surface px-3 py-2 text-[14px] leading-none text-text-primary shadow-sm transition-colors placeholder:text-text-muted !outline-none focus:border-text-muted focus:ring-[3px] focus:ring-slate-900/[0.07] disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
