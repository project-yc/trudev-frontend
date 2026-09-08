const SIGNAL_SCORE_MAPPING = {
  green: { score: 5, label: 'Strong' },
  yellow: { score: 3.5, label: 'Developing' },
  red: { score: 2, label: 'Needs Work' },
};

const SIGNAL_TEXT_CLASS = {
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
};

const SIGNAL_DOT_CLASS = {
  green: 'bg-green-400',
  yellow: 'bg-yellow-400',
  red: 'bg-red-400',
};

const SUBSCORE_LABELS = {
  planning_debugging: 'Planning & Debugging',
  verification: 'Verification',
  direction: 'Direction',
  iteration: 'Iteration',
};

function formatSubscoreLabel(key) {
  return SUBSCORE_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SignalCard({ title, signal, score, summary, subscores, evaluated = true }) {
  // A dimension that was not evaluated is not a bad one. The unknown-signal
  // fallback used to be red "Needs Work 2/5" — shown to every candidate at
  // `none`/`inline_completions`, every short session and every degraded report.
  if (evaluated === false || signal === 'not_evaluated' || signal == null) {
    return (
      <article className="rounded-xl border border-[#1e2130] bg-[#13151f] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">{title || 'Signal'}</h3>
          <span className="h-2 w-2 rounded-full bg-gray-600" />
        </div>
        <p className="mb-2 text-sm font-semibold text-gray-400">Not evaluated</p>
        <p className="mb-4 min-h-10 text-sm text-gray-400">{summary || 'This dimension was not part of the score for this session.'}</p>
        <div className="flex items-end gap-1 text-white">
          <span className="text-4xl font-bold text-gray-500">—</span>
        </div>
      </article>
    );
  }
  const normalizedSignal = SIGNAL_SCORE_MAPPING[signal] ? signal : 'yellow';
  const scoreData = SIGNAL_SCORE_MAPPING[normalizedSignal];
  const subscoreEntries = subscores && typeof subscores === 'object'
    ? Object.entries(subscores).filter(([, v]) => typeof v === 'number')
    : [];
  const displayScore = typeof score === 'number' ? Math.round(score) : scoreData.score;
  const displayScale = typeof score === 'number' ? '/100' : '/5';

  return (
    <article className="rounded-xl border border-[#1e2130] bg-[#13151f] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">{title || 'Signal'}</h3>
        <span className={`h-2 w-2 rounded-full ${SIGNAL_DOT_CLASS[normalizedSignal]}`} />
      </div>

      <p className={`mb-2 text-sm font-semibold ${SIGNAL_TEXT_CLASS[normalizedSignal]}`}>{scoreData.label}</p>
      <p className="mb-4 min-h-10 text-sm text-gray-400">{summary || 'No summary available.'}</p>

      <div className="flex items-end gap-1 text-white">
        <span className="text-4xl font-bold">{displayScore}</span>
        <span className="pb-1 text-sm text-gray-400">{displayScale}</span>
      </div>

      {subscoreEntries.length > 0 && (
        <div className="mt-4 border-t border-[#1e2130] pt-3 space-y-1.5">
          {subscoreEntries.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{formatSubscoreLabel(key)}</span>
              <span className="font-mono text-gray-300">{value}<span className="text-gray-600">/100</span></span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}