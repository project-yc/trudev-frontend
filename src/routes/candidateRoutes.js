// Candidate-facing route patterns and the builders that produce concrete paths
// for them. App.jsx mounts the patterns; pages navigate with the builders, so a
// path only ever changes in this file.
//
// `buildCandidateSectionRoute` / `buildCandidateCompletionRoute` for the
// `section` and `complete` patterns still live in api/candidate/runtime.js
// (they predate this module and runtime.js is consumed by the IDE hand-off).
// They can move here once that file is next touched.

export const CANDIDATE_ROUTES = {
  invite: '/invite/:token',
  // Public demo landing: no invite yet, the page mints one on "Start the demo".
  demo: '/demo/:slug',
  landing: '/assessment/:token',
  terms: '/assessment/:token/terms',
  // Coding-first assessments hand off here after the terms are accepted: the
  // workspace provisions in the background while the candidate reads the intro.
  launch: '/assessment/:token/launch',
  mcqSection: '/assessment/:token/mcq/:sectionIndex',
  section: '/candidate/assessment/:instanceId/sections/:sectionId',
  complete: '/candidate/assessment/:instanceId/complete',
};

export const buildInviteRoute = (token) => `/invite/${token}`;

export const buildAssessmentLandingRoute = (token) => `/assessment/${token}`;

export const buildAssessmentTermsRoute = (token) => `/assessment/${token}/terms`;

export const buildAssessmentLaunchRoute = (token) => `/assessment/${token}/launch`;

export const buildMcqSectionRoute = (token, sectionIndex) => (
  `/assessment/${token}/mcq/${sectionIndex}`
);
