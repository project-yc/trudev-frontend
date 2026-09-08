import { Navigate, useParams } from 'react-router-dom'
import { buildAssessmentLandingRoute } from '../../routes/candidateRoutes'

// /invite/:token is the link candidates receive by email. It used to render
// its own verify/loading/error UI (VerifyCandidateInvite); that's now fully
// superseded by /assessment/:token, which verifies the same token itself via
// assessment-overview. Redirecting here (instead of re-verifying) avoids a
// redundant hit against the invite-scoped rate limit for no benefit.
export default function InviteRedirect() {
  const { token } = useParams()
  return <Navigate to={buildAssessmentLandingRoute(token)} replace />
}
