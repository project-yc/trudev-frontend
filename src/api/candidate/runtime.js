const CANDIDATE_RUNTIME_STORAGE_KEY = 'candidateRuntimeState'

const JSON_HEADERS = {
  'Content-Type': 'application/json',
}

const parseJson = async (response) => response.json().catch(() => ({}))

export const requestCandidate = async (url, token, options = {}, { unwrapData = true, timeoutMs } = {}) => {
  // Opt-in timeout. Without one a stalled mobile connection left a bare
  // `fetch` hanging for minutes while the section clock ran and the composer
  // stayed disabled. Callers that do not pass `timeoutMs` are unchanged.
  const controller = timeoutMs ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  let response
  try {
    response = await fetch(url, {
      ...options,
      ...(controller ? { signal: controller.signal } : {}),
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    })
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeoutError = new Error('The request took too long. Check your connection and try again.')
      timeoutError.status = 0
      timeoutError.code = 'timeout'
      throw timeoutError
    }
    throw err
  } finally {
    if (timer) clearTimeout(timer)
  }

  const body = await parseJson(response)
  if (!response.ok) {
    // Surface status + machine-readable code so callers can distinguish
    // "interview complete" / "timer expired" / "out of sync" instead of
    // rendering every failure as a generic unavailable screen.
    const detail = body?.detail
    const message = (detail && typeof detail === 'object' ? detail.message : detail)
      || body?.message
      || 'Candidate runtime request failed'
    const error = new Error(message)
    error.status = response.status
    error.code = body?.data?.code
      || (detail && typeof detail === 'object' ? detail.code : null)
      || null
    error.data = body?.data ?? null
    throw error
  }

  if (!unwrapData) {
    return body
  }

  return body?.data ?? body
}

export const buildCandidateSectionRoute = (assessmentInstanceId, sectionId) => (
  `/candidate/assessment/${assessmentInstanceId}/sections/${sectionId}`
)

export const buildCandidateCompletionRoute = (assessmentInstanceId) => (
  `/candidate/assessment/${assessmentInstanceId}/complete`
)

export const normalizeCandidateRuntimeState = (payload = {}) => ({
  assessmentInstanceId: payload.assessment_instance_id || payload.assessmentInstanceId || null,
  assessmentName: payload.assessment_name || payload.assessmentName || null,
  sectionId: payload.section_id || payload.sectionId || null,
  sectionName: payload.section_name || payload.sectionName || null,
  sectionTimerMinutes: payload.section_timer_minutes || payload.sectionTimerMinutes || null,
  sectionOrder: payload.section_order || payload.sectionOrder || null,
  sectionCount: payload.section_count || payload.sectionCount || null,
  sectionItems: payload.section_items || payload.sectionItems || [],
  currentItemAttemptId: payload.current_item_attempt_id || payload.currentItemAttemptId || null,
  contentType: payload.content_type || payload.contentType || null,
  sectionToken: payload.section_token || payload.sectionToken || null,
  sessionToken: payload.session_token || payload.sessionToken || null,
  sessionId: payload.session_id || payload.sessionId || null,
  workspaceUrl: payload.workspace_url || payload.workspaceUrl || null,
  nextAction: payload.next_action || payload.nextAction || null,
  frontendRoute: payload.frontend_route || payload.frontendRoute || null,
  completionRoute: payload.completion_route || payload.completionRoute || null,
})

export const saveCandidateRuntimeState = (payload) => {
  const normalized = normalizeCandidateRuntimeState(payload)
  sessionStorage.setItem(CANDIDATE_RUNTIME_STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export const loadCandidateRuntimeState = () => {
  const raw = sessionStorage.getItem(CANDIDATE_RUNTIME_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    sessionStorage.removeItem(CANDIDATE_RUNTIME_STORAGE_KEY)
    return null
  }
}

export const clearCandidateRuntimeState = () => {
  sessionStorage.removeItem(CANDIDATE_RUNTIME_STORAGE_KEY)
}

export const getCandidateNextAction = async (assessmentInstanceId, token) => (
  requestCandidate(
    `/api/v1/candidate/assessment/${assessmentInstanceId}/next-action`,
    token,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    },
    { unwrapData: false },
  )
)

export const getMcqRuntime = async (itemAttemptId, token) => (
  requestCandidate(`/api/v1/candidate/items/${itemAttemptId}/mcq`, token)
)

export const autosaveMcqRuntime = async (itemAttemptId, token, selectedOptionIds) => (
  requestCandidate(`/api/v1/candidate/items/${itemAttemptId}/mcq`, token, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ selected_option_ids: selectedOptionIds }),
  })
)

export const submitMcqRuntime = async (itemAttemptId, token, selectedOptionIds) => (
  requestCandidate(`/api/v1/candidate/items/${itemAttemptId}/mcq/submit`, token, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ selected_option_ids: selectedOptionIds }),
  })
)

export const getFreeTextRuntime = async (itemAttemptId, token) => (
  requestCandidate(`/api/v1/candidate/items/${itemAttemptId}/free-text`, token)
)

export const autosaveFreeTextRuntime = async (itemAttemptId, token, responseText) => (
  requestCandidate(`/api/v1/candidate/items/${itemAttemptId}/free-text`, token, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ response_text: responseText }),
  })
)

export const submitFreeTextRuntime = async (itemAttemptId, token, responseText) => (
  requestCandidate(`/api/v1/candidate/items/${itemAttemptId}/free-text/submit`, token, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ response_text: responseText }),
  })
)

export const getRankingRuntime = async (itemAttemptId, token) => (
  requestCandidate(`/api/v1/candidate/items/${itemAttemptId}/ranking`, token)
)

export const autosaveRankingRuntime = async (itemAttemptId, token, rankedOptionIds) => (
  requestCandidate(`/api/v1/candidate/items/${itemAttemptId}/ranking`, token, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ ranked_option_ids: rankedOptionIds }),
  })
)

export const submitRankingRuntime = async (itemAttemptId, token, rankedOptionIds) => (
  requestCandidate(`/api/v1/candidate/items/${itemAttemptId}/ranking/submit`, token, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ ranked_option_ids: rankedOptionIds }),
  })
)