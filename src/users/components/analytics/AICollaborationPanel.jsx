const PATTERN_LABELS = {
  strategic: 'Strategic Usage',
  balanced: 'Balanced Usage',
  boilerplate_only: 'Boilerplate Only',
  under_use: 'Under-utilized',
  over_reliant: 'Over-reliant',
  // The backend reports `not_used` when the candidate had AI available and
  // never used it (dimension reason `ai_not_used`). That is a choice, not
  // under-utilization, and the label must not contradict the dimension.
  not_used: 'AI Not Used',
  inline_only: 'Inline Completions Only',
  none: 'AI Disabled',
};

export default function AICollaborationPanel({ analysis }) {
  const patternKey = analysis?.pattern;
  const patternLabel = PATTERN_LABELS[patternKey] || 'Usage Pattern Unavailable';

  return (
    <section className="rounded-xl border border-[#1e2130] bg-[#13151f] p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">AI Collaboration Analysis</p>

      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-cyan-400" />
        <p className="text-sm font-medium text-white">{patternLabel}</p>
      </div>

      <p className="mb-4 text-sm text-gray-400">{analysis?.coaching || 'No coaching insights available yet.'}</p>

      <div className="rounded-lg border border-[#1e2130] bg-[#0b0f18] p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Improvement Suggestion</p>
        <pre className="overflow-x-auto text-xs leading-relaxed text-cyan-300">
          <code>{analysis?.improvement_example || 'No example provided.'}</code>
        </pre>
      </div>
    </section>
  );
}