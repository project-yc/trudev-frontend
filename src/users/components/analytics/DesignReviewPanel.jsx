import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const BADGE_CLASS = {
  MET: 'bg-green-500/20 text-green-400 border border-green-500/30',
  // A different-but-sound approach is full credit in scoring; it rendered as
  // NOT_MET here because the badge map did not know the value.
  ALTERNATIVE: 'bg-green-500/20 text-green-400 border border-green-500/30',
  PARTIALLY_MET: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  NOT_MET: 'bg-red-500/20 text-red-400 border border-red-500/30',
  NOT_EVALUATED: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

const normalizeAssessment = (assessment) => {
  if (!assessment || typeof assessment !== 'string') {
    return 'NOT_MET';
  }

  return BADGE_CLASS[assessment] ? assessment : 'NOT_EVALUATED';
};

export default function DesignReviewPanel({ criteria }) {
  const [openRow, setOpenRow] = useState(null);
  const items = Array.isArray(criteria) ? criteria : [];

  return (
    <section className="rounded-xl border border-[#1e2130] bg-[#13151f] p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Design Review</p>

      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-gray-400">No design criteria available.</p>}

        {items.map((item, index) => {
          const assessment = normalizeAssessment(item?.assessment);
          const isOpen = openRow === index;
          const hasHint = Boolean(item?.explanation || item?.improvement_hint);

          return (
            <div key={`${item?.criterion || 'criterion'}-${index}`} className="rounded-lg border border-[#1e2130] bg-[#0f121a]">
              <button
                type="button"
                onClick={() => setOpenRow(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="text-sm text-white">{item?.criterion || 'Untitled Criterion'}</span>

                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold tracking-widest ${BADGE_CLASS[assessment]}`}>
                    {assessment.replaceAll('_', ' ')}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isOpen && hasHint && (
                <div className="space-y-2 border-t border-[#1e2130] px-4 py-3 text-sm text-gray-400">
                  {item?.explanation && (
                    <p>
                      <span className="font-semibold text-gray-300">Why:</span> {item.explanation}
                    </p>
                  )}
                  {item?.improvement_hint && (
                    <p>
                      <span className="font-semibold text-gray-300">Hint:</span> {item.improvement_hint}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}