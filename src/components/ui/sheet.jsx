
import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * How long the close animation runs, in ms.
 *
 * Radix keeps the content MOUNTED for the whole exit animation, so anything a
 * caller resets the instant it sets `open={false}` is visible inside the panel
 * while it slides away. A drawer that clears its form on close therefore has to
 * wait this long before clearing it, or the user watches it revert to a blank
 * form on the way out.
 *
 * Must match `.animate-sheet-out-*` in src/index.css. It is exported rather
 * than duplicated at each call site so there is one number to change.
 */
export const SHEET_EXIT_DURATION_MS = 240;

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]',
      // Real CSS animations from src/index.css. These used to be
      // tailwindcss-animate's `animate-in` / `fade-in-0`, which compile to
      // nothing here because the plugin is not installed (`plugins: []` in
      // tailwind.config.js) — so the overlay popped in and out instantly.
      'data-[state=open]:animate-sheet-overlay-in data-[state=closed]:animate-sheet-overlay-out',
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

// The slide is a real keyframe animation (src/index.css), not a transition.
// `transition ease-in-out data-[state=*]:duration-*` was doing nothing: nothing
// on the panel changed a transitionable property between the open and closed
// states, and the `slide-in-from-*` classes that were supposed to supply the
// offset are tailwindcss-animate utilities that this build never generated. The
// result was a drawer that teleported. `will-change: transform` keeps the panel
// on its own compositor layer so a tall, scrollable form slides without tearing.
const sheetVariants = cva(
  'fixed z-50 flex flex-col gap-0 bg-surface shadow-xl will-change-transform',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b border-border-subtle data-[state=open]:animate-sheet-in-top data-[state=closed]:animate-sheet-out-top',
        bottom: 'inset-x-0 bottom-0 border-t border-border-subtle data-[state=open]:animate-sheet-in-bottom data-[state=closed]:animate-sheet-out-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r border-border-subtle data-[state=open]:animate-sheet-in-left data-[state=closed]:animate-sheet-out-left sm:max-w-sm',
        right: 'inset-y-0 right-0 h-full w-full border-l border-border-subtle data-[state=open]:animate-sheet-in-right data-[state=closed]:animate-sheet-out-right',
      },
    },
    defaultVariants: { side: 'right' },
  },
);

// `container` portals into a specific element instead of <body> — used by the
// candidate screens so the sheet inherits their dark theme variables.
const SheetContent = React.forwardRef(({ side = 'right', className, children, container, ...props }, ref) => (
  <SheetPortal container={container}>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1.5 text-text-muted opacity-70 transition-opacity hover:opacity-100 hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col gap-1 px-6 py-4 border-b border-border-subtle flex-shrink-0', className)} {...props} />
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({ className, ...props }) => (
  <div className={cn('mt-auto flex items-center justify-end gap-3 px-6 py-4 border-t border-border-subtle flex-shrink-0', className)} {...props} />
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn('text-[16px] font-bold text-text-primary', className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn('text-[13px] text-text-secondary', className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet, SheetPortal, SheetOverlay, SheetTrigger, SheetClose,
  SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription,
};