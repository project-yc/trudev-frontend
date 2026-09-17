// Prospect analytics for the tour, via PostHog.
//
// Does nothing unless VITE_POSTHOG_KEY is set — no script is loaded and no
// request is made. When it is set:
//   * posthog-js is imported lazily, so the tour chunk stays small;
//   * nothing is autocaptured and there is no session recording — only the
//     explicit tour_* events below;
//   * persistence is in memory only: no cookies or localStorage, so no consent
//     banner is needed;
//   * the `ref` from the URL becomes the distinct ID, so every event from one
//     emailed link lands on one person in PostHog.
//
// Events: tour_opened, tour_step_viewed, tour_skip_to_report, tour_completed,
// tour_cta_clicked.

let client = null;
let loading = null;
const queue = [];

export function initTourAnalytics({ ref, company, role }) {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key || loading) return;

  loading = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://r.trudev.io',
        defaults: '2026-05-30',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        persistence: 'memory',
        person_profiles: 'identified_only',
        ...(ref ? { bootstrap: { distinctID: ref, isIdentifiedID: true } } : {}),
      });
      posthog.register({
        tour_ref: ref || null,
        tour_company: company || null,
        tour_role: role || null,
      });
      client = posthog;
      queue.splice(0).forEach(([event, props]) => posthog.capture(event, props));
    })
    .catch(() => {
      // Analytics must never break the tour.
      queue.length = 0;
    });
}

export function track(event, props = {}) {
  if (client) {
    client.capture(event, props);
  } else if (loading) {
    queue.push([event, props]);
  }
}
