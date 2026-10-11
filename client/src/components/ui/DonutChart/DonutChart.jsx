import { useState } from 'react';
import { cx } from '../../../utils/cx.js';
import { formatNumber } from '../../../utils/format.js';
import './DonutChart.css';

const COLOURS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];

export default function DonutChart({ items = [], size = 160, label = 'Share', className }) {
  const [hover, setHover] = useState(null);
  const total = items.reduce((sum, i) => sum + i.value, 0) || 1;
  const radius = 15.9155;
  const gapPct = items.length > 1 ? 0.6 : 0;
  let offset = 25;

  const segments = items.map((item, index) => {
    const pct = (item.value / total) * 100;
    const segment = { ...item, index, pct, dash: Math.max(0, pct - gapPct), offset };
    offset -= pct;
    return segment;
  });

  return (
    <div className={cx('donut', className)}>
      <svg viewBox="0 0 42 42" width={size} height={size} role="img" aria-label={label} className="donut__svg">
        <circle cx="21" cy="21" r={radius} fill="none" stroke="var(--colour-band)" strokeWidth="7" />
        {segments.map((s) => (
          <circle
            key={s.label}
            cx="21"
            cy="21"
            r={radius}
            fill="none"
            stroke={COLOURS[s.index % COLOURS.length]}
            strokeWidth={hover === s.index ? 8.5 : 7}
            strokeDasharray={`${s.dash} ${100 - s.dash}`}
            strokeDashoffset={s.offset}
            onMouseEnter={() => setHover(s.index)}
            onMouseLeave={() => setHover(null)}
            className="donut__segment"
          >
            <title>{`${s.label}: ${Math.round(s.percent ?? s.pct)}%`}</title>
          </circle>
        ))}
        {hover !== null && (
          <text x="21" y="22.5" textAnchor="middle" className="donut__centre">
            {Math.round(segments[hover].percent ?? segments[hover].pct)}%
          </text>
        )}
      </svg>
      <ul className="donut__legend">
        {segments.map((s) => (
          <li
            key={s.label}
            className={cx('donut__row', hover === s.index && 'donut__row--active')}
            onMouseEnter={() => setHover(s.index)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="donut__dot" style={{ background: COLOURS[s.index % COLOURS.length] }} aria-hidden="true" />
            <span className="donut__label">{s.label}</span>
            <span className="donut__value" title={formatNumber(s.value)}>{Math.round(s.percent ?? s.pct)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
