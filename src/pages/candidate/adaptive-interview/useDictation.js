import { useCallback, useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Dictation for the answer composer.
//
// Speech goes INTO the textarea rather than straight to the server, so the
// candidate reads and edits before sending. That matters more here than
// anywhere else in the product: the transcript is what gets graded, and
// recognition mishears technical vocabulary constantly ("recursion" as
// "regression", "async" as "a sink"). Push-to-talk with no visible transcript
// would swap typing speed for recognition accuracy as the thing being measured
// — and would penalise non-native speakers twice over.
//
// Continuous open-mic was the other option and is worse: it needs endpointing
// we do not have, and an always-listening indicator makes people self-conscious
// in an already stressful moment.
// ─────────────────────────────────────────────────────────────────────────────

const getRecognitionCtor = () => (
  typeof window === 'undefined'
    ? null
    : window.SpeechRecognition || window.webkitSpeechRecognition || null
)

const dictationSupported = () => Boolean(getRecognitionCtor())

/**
 * @param onCommit called with each finalized phrase, to append to the composer.
 */
export function useDictation({ onCommit, language }) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)
  // Kept in a ref so the recognition callbacks never close over a stale
  // composer value — they outlive the render that created them. Assigned in an
  // effect rather than during render: a ref written during render is not
  // guaranteed to be the value React commits.
  const onCommitRef = useRef(onCommit)
  useEffect(() => {
    onCommitRef.current = onCommit
  }, [onCommit])
  // `onend` fires both when the user stops and when the service times out.
  // Only the second should restart, or "stop" would immediately re-listen.
  const wantsToListenRef = useRef(false)

  const stop = useCallback(() => {
    wantsToListenRef.current = false
    setListening(false)
    setInterim('')
    try {
      recognitionRef.current?.stop()
    } catch {
      // Already stopped — nothing to do.
    }
  }, [])

  const start = useCallback(() => {
    const Recognition = getRecognitionCtor()
    if (!Recognition) return

    setError('')
    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    if (language) recognition.lang = language

    recognition.onresult = (event) => {
      let pending = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const transcript = result[0]?.transcript || ''
        if (result.isFinal) {
          const phrase = transcript.trim()
          if (phrase) onCommitRef.current?.(phrase)
        } else {
          pending += transcript
        }
      }
      setInterim(pending)
    }

    recognition.onerror = (event) => {
      // `no-speech` and `aborted` are normal in a paused conversation and must
      // not surface as failures — the candidate simply stopped talking.
      if (event.error === 'no-speech' || event.error === 'aborted') return
      wantsToListenRef.current = false
      setListening(false)
      setInterim('')
      setError(
        event.error === 'not-allowed'
          ? 'Microphone access was blocked. Allow it in your browser, or keep typing.'
          : 'Voice input stopped working. You can keep typing.',
      )
    }

    recognition.onend = () => {
      setInterim('')
      // Browsers end the session after a stretch of silence. Resume unless the
      // candidate actually pressed stop.
      if (wantsToListenRef.current) {
        try {
          recognition.start()
          return
        } catch {
          // Fall through to stopped state.
        }
      }
      setListening(false)
    }

    recognitionRef.current = recognition
    wantsToListenRef.current = true
    try {
      recognition.start()
      setListening(true)
    } catch {
      wantsToListenRef.current = false
      setError('Voice input could not start. You can keep typing.')
    }
  }, [language])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  // A live recognition session left running after unmount keeps the microphone
  // indicator on for the rest of the assessment.
  useEffect(() => () => {
    wantsToListenRef.current = false
    try {
      recognitionRef.current?.abort()
    } catch {
      // Nothing to abort.
    }
  }, [])

  return { listening, interim, error, toggle, stop, supported: dictationSupported() }
}
