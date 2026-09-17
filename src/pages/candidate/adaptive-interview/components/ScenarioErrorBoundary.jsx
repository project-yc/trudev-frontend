import { Component } from 'react'

/**
 * Keeps a malformed scenario from taking the whole interview down with it.
 *
 * The scenario object is blueprint/LLM-authored content that Django forwards
 * out of the question's `metadata_json` WHOLESALE and UNVALIDATED — there is no
 * schema on either side of that hop. Every renderer below this point
 * dereferences a required field directly (`scenario.sections.map`,
 * `section.body.split`, `section.stats.map`, `section.lines[0]`,
 * `section.messages.map`), so one absent key is a render-time TypeError.
 *
 * Without a boundary React unmounts the entire tree on an uncaught render
 * error: the live interview is replaced by a blank white page, taking the
 * candidate's typed-but-unsent answer with it, mid-assessment, with no
 * indication that a refresh would help. A scenario is SUPPORTING material —
 * losing it must cost the candidate the panel, never the interview.
 *
 * Scoped deliberately: this wraps only the scenario subtree, so a genuine bug
 * in the chat or composer still surfaces loudly in development instead of being
 * swallowed here.
 */
export default class ScenarioErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    // Logged, not silent: a shape mismatch here means the engine is emitting a
    // scenario the renderers do not understand, and nobody finds that from a
    // candidate's blank panel.
    console.error('[adaptive-interview] scenario failed to render', error, info)
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="text-[12px] leading-[18px] text-text-muted">
          This reference panel could not be displayed. You can still answer the
          question. Ask for anything you need in your answer.
        </p>
      )
    }
    return this.props.children
  }
}
