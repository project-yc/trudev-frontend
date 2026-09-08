// Radial score gauge matching the MCQ panel treatment in Figma:
// a 240° arc opening at the bottom, value centred, caption beneath.

import { useState } from 'react';

const SIZE = 148;
const RADIUS = 58;
const STROKE = 17;
const SWEEP = 240;
const START_ANGLE = 150; // degrees clockwise from 12 o'clock

function polarToCartesian(cx, cy, radius, angleDegrees) {
  const radians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeArc(cx, cy, radius, startAngle, sweepAngle) {
  const endAngle = startAngle + sweepAngle;
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArc = sweepAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

let gaugeInstanceCount = 0;

export function ScoreGauge({ value, caption, gradientId }) {
  // Every mounted gauge needs its own gradient id — SVG ids are document-global,
  // so two gauges sharing one made the second resolve against the first's
  // definition.
  const [fallbackGradientId] = useState(() => `score-gauge-${++gaugeInstanceCount}`);
  const resolvedGradientId = gradientId || fallbackGradientId;

  const centre = SIZE / 2;
  // A missing score is not a zero. Coercing it painted an empty gauge reading
  // "0/100", which reads as the candidate scoring nothing rather than the
  // section not having been graded. Guard null/'' explicitly, because
  // Number(null) === 0 is finite and would defeat the check below.
  const numeric =
    value === null || value === undefined || value === '' ? NaN : Number(value);
  const hasScore = Number.isFinite(numeric);
  const clamped = hasScore ? Math.max(0, Math.min(100, numeric)) : 0;
  const track = describeArc(centre, centre, RADIUS, START_ANGLE, SWEEP);
  const progress = describeArc(centre, centre, RADIUS, START_ANGLE, (SWEEP * clamped) / 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <defs>
            <linearGradient id={resolvedGradientId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-report-metric-start)" />
              <stop offset="100%" stopColor="var(--color-report-metric-end)" />
            </linearGradient>
          </defs>
          <path
            d={track}
            fill="none"
            stroke="var(--color-surface-muted)"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          {hasScore && clamped > 0 && (
            <path
              d={progress}
              fill="none"
              stroke={`url(#${resolvedGradientId})`}
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
          )}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-[6px]">
          {hasScore ? (
            <span className="text-[26px] font-bold leading-none text-text-primary">
              {Math.round(clamped)}
              <span className="text-[15px] font-semibold text-text-muted">/100</span>
            </span>
          ) : (
            <span className="text-[13px] font-semibold leading-none text-text-muted">Not graded</span>
          )}
        </div>
      </div>

      {caption && <p className="mt-[2px] text-center text-[12px] leading-[16px] text-text-muted">{caption}</p>}
    </div>
  );
}
