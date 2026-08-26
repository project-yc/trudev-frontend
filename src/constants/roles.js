// Display names for the backend's role keys (accounts/constants.py UserRoles).
//
// Kept in one place because the raw keys are storage values, not copy —
// "ORG_ADMIN" is fine in a JWT claim and wrong in a sidebar.
export const ROLE_LABELS = {
  ADMIN: 'Admin',
  ORG_ADMIN: 'Org admin',
  RECRUITER: 'Recruiter',
  REVIEWER: 'Reviewer',
  OBSERVER: 'Observer',
  USER: 'User',
  CANDIDATE: 'Candidate',
};
