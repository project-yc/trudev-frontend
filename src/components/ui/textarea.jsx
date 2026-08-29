import * as React from 'react';
import { cn } from '../../lib/utils';

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[80px] w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-[14px] text-text-primary',
      // Neutral focus, matching Input and SelectTrigger — see the note in
      // input.jsx for why the brand-tinted ring had to go.
      'placeholder:text-text-muted !outline-none focus:border-text-muted focus:ring-[3px] focus:ring-slate-900/[0.07]',
      'disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 resize-y',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
