// Settings for the public product tour at /tour.
//
// The tour is the link in outbound emails, e.g.
//   https://app.trudev.io/tour?c=Acme&r=Backend%20Engineer&ref=acme-cto-01
// `c` (company) and `r` (role) personalise the copy; `ref` is an opaque ID per
// prospect that tags analytics so you can see who opened it and how far they
// got. Never put a person's name or email in the URL.

// Roadmap interview modes (résumé deep dive, uploaded material, behavioral)
// are presented as available when true. Set to false to label them
// "Coming soon" instead — nothing else needs to change.
export const ROADMAP_AS_LIVE = true;

// "Book a call" target. Unset hides the button and the outro asks the prospect
// to reply to the email instead.
export const BOOKING_URL = import.meta.env.VITE_TOUR_BOOKING_URL || '';

// Slug of a public live demo created with `set_public_demo` on the backend.
// When set, the outro links to /demo/<slug> so a warm prospect can sit the
// real assessment. Unset hides that link.
export const LIVE_DEMO_SLUG = import.meta.env.VITE_TOUR_LIVE_DEMO_SLUG || '';

export const DEFAULT_COMPANY = 'your company';
export const DEFAULT_ROLE = 'Backend Engineer';
