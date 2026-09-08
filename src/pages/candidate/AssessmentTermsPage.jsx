import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { IconChevronRight } from '@tabler/icons-react'
import { getAssessmentOverview, startAssessment } from '../../api/candidate/assessmentSession'
import { saveCandidateBranding } from '../../theme/CandidateThemeProvider.jsx'
import {
  CandidateCenteredErrorState,
  CandidateCenteredLoadingState,
  CandidateSectionIntroScreen,
} from '../../components/candidate/CandidateSectionScaffold'
import { handleAssessmentStartResponse } from './assessmentStartNavigation'

const RULES = [
  'The clock starts as soon as you press "Start" on a section. In the coding IDE you may pause with the Pause button; other sections cannot be paused.',
  'Answers save automatically as you go, but nothing is submitted until you confirm.',
  'This assessment may include a monitored or AI-assisted interview section — stay on the assessment tab and avoid switching windows during timed sections.',
  'Do not share your invite link or assessment content with anyone else.',
]

export default function AssessmentTermsPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [overview, setOverview] = useState(location.state?.overview || null)
  const [loading, setLoading] = useState(!location.state?.overview)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    if (overview) return
    getAssessmentOverview(token)
      .then((data) => {
        if (data?.org_branding) saveCandidateBranding(data.org_branding)
        setOverview(data)
      })
      .catch((e) => setError(e.message || 'Failed to load assessment'))
      .finally(() => setLoading(false))
  }, [token, overview])

  const handleStart = async () => {
    setStarting(true)
    setError('')
    try {
      const data = await startAssessment(token, { terms_accepted: true })
      handleAssessmentStartResponse(data, { token, overview, navigate })
    } catch (e) {
      setError(e.message || 'Failed to start assessment')
      setStarting(false)
    }
  }

  if (loading) {
    return <CandidateCenteredLoadingState label="Loading assessment..." />
  }

  if (!overview) {
    return (
      <CandidateCenteredErrorState
        title="Unable to load assessment"
        message={error || 'This link may be invalid or expired.'}
      />
    )
  }

  return (
    <CandidateSectionIntroScreen
      eyebrow="Before you start"
      title="Terms & assessment rules"
      subtitle={`Please review before beginning "${overview.assessment_name}".`}
      noticeTitle="Rules & monitoring disclosure"
      tips={RULES}
      error={error}
      consent={{
        checked: agreed,
        onChange: setAgreed,
        label: 'I have read and agree to these rules and consent to my responses being recorded and evaluated as part of this assessment.',
      }}
      onAction={handleStart}
      actionDisabled={!agreed || starting}
      actionContent={
        starting ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60" />
        ) : (
          <>
            I Agree — Start Assessment
            <IconChevronRight size={16} />
          </>
        )
      }
    />
  )
}
