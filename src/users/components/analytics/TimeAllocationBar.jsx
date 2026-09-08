// Active-time segments. The backend computes these as a share of ACTIVE time,
// while `idle_pct` is a share of the wall clock (deterministic_analysis
// `_time_breakdown`). Listing idle alongside them made the legend sum past
// 100%, so idle is reported separately below.
const SEGMENT_DEFINITIONS = [
  { key: 'planning_pct', label: 'Planning', barClass: 'bg-gray-500' },
  { key: 'coding_pct', label: 'Coding', barClass: 'bg-cyan-400' },
  { key: 'debugging_pct', label: 'Debugging', barClass: 'bg-teal-400' },
  { key: 'testing_pct', label: 'Testing', barClass: 'bg-cyan-600' },
  { key: 'ai_collab_pct', label: 'AI Usage', barClass: 'bg-gray-400' },
];

const formatPercent = (value) => (Number.isInteger(value) ? value : Math.round(value * 10) / 10);

const COLUMN_SPAN_CLASS = {
  0: 'hidden',
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12',
};

const toSafePercent = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return 0;
  }

  return value;
};

const buildSegmentUnits = (segments) => {
  const total = segments.reduce((sum, item) => sum + item.percent, 0);

  if (!total) {
    return segments.map(() => 0);
  }

  const exact = segments.map((item) => (item.percent / total) * 12);
  const units = exact.map((value) => Math.floor(value));
  let allocated = units.reduce((sum, value) => sum + value, 0);

  while (allocated < 12) {
    let targetIndex = -1;
    let maxRemainder = -1;

    exact.forEach((value, index) => {
      const remainder = value - units[index];
      if (remainder > maxRemainder) {
        maxRemainder = remainder;
        targetIndex = index;
      }
    });

    if (targetIndex === -1) {
      break;
    }

    units[targetIndex] += 1;
    allocated += 1;
  }

  return units;
};

export default function TimeAllocationBar({ timeBreakdown }) {
  // Display gate: backend sets `display_ready=false` when active time is
  // below the safe threshold (smoke tests, abandoned sessions). A
  // half-empty bar is more misleading than no bar at all.
  if (timeBreakdown && timeBreakdown.display_ready === false) {
    const activeSeconds = Number(timeBreakdown.active_seconds || 0);
    return (
      <section className="rounded-xl border border-[#1e2130] bg-[#13151f] p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Time Allocation</p>
        <p className="text-sm text-gray-400">
          Session too short for time analysis ({Math.round(activeSeconds)}s of active work).
        </p>
      </section>
    );
  }

  const segments = SEGMENT_DEFINITIONS.map((definition) => ({
    ...definition,
    percent: toSafePercent(timeBreakdown?.[definition.key]),
  }));

  const units = buildSegmentUnits(segments);
  const idlePercent = toSafePercent(timeBreakdown?.idle_pct);

  return (
    <section className="rounded-xl border border-[#1e2130] bg-[#13151f] p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Time Allocation</p>

      <p className="mb-3 text-xs text-gray-400">
        {idlePercent > 0 ? (
          <>
            <span className="font-semibold text-gray-300">{formatPercent(idlePercent)}% of session idle</span>
            {' · of active time:'}
          </>
        ) : (
          'Of active time:'
        )}
      </p>

      <div className="grid grid-cols-12 overflow-hidden rounded-full border border-[#1e2130] bg-[#0c0f18]">
        {segments.map((segment, index) => (
          <div
            key={segment.key}
            title={`${segment.label}: ${segment.percent}%`}
            className={`h-6 ${COLUMN_SPAN_CLASS[units[index]]} ${segment.barClass}`}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-400 md:grid-cols-3">
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${segment.barClass}`} />
            <span>
              {segment.label} ({formatPercent(segment.percent)}%)
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}