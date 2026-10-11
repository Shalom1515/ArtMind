import { useMemo, useState } from 'react';
import { useElementWidth } from '../../../hooks/useElementWidth.js';
import { cx } from '../../../utils/cx.js';
import { formatDate, formatNumber } from '../../../utils/format.js';
import './LineChart.css';

function niceMax(value) {
  if (value <= 0) return 10;
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
}

export default function LineChart({ data = [], height = 220, label = 'Chart', xLabel = 'Days', valueLabel = 'Count', className }) {
  const [ref, width] = useElementWidth(560);
  const [hover, setHover] = useState(null);
  const pad = { top: 12, right: 12, bottom: 40, left: 40 };
  const innerW = Math.max(10, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;

  const { points, ticks, max } = useMemo(() => {
    const top = niceMax(Math.max(0, ...data.map((d) => d.count)));
    const step = data.length > 1 ? innerW / (data.length - 1) : 0;
    return {
      max: top,
      ticks: [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f)),
      points: data.map((d, i) => ({ ...d, x: pad.left + i * step, y: pad.top + innerH - (d.count / top) * innerH })),
    };
  }, [data, innerW, innerH, pad.left, pad.top]);

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const xTicks = points.filter((_, i) => i === 0 || (i + 1) % 5 === 0 || i === points.length - 1);

  const onMove = (event) => {
    if (!points.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX ?? event.touches?.[0]?.clientX) - rect.left;
    let nearest = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(points[nearest].x - x)) nearest = i;
    });
    setHover(nearest);
  };

  const active = hover !== null ? points[hover] : null;

  return (
    <div ref={ref} className={cx('line-chart', className)}>
      <svg width={width} height={height} role="img" aria-label={label} onMouseMove={onMove} onMouseLeave={() => setHover(null)} onTouchStart={onMove}>
        {ticks.map((t) => {
          const y = pad.top + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line x1={pad.left} x2={pad.left + innerW} y1={y} y2={y} className="line-chart__grid" />
              <text x={pad.left - 8} y={y + 4} className="line-chart__tick" textAnchor="end">{t}</text>
            </g>
          );
        })}
        <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + innerH} className="line-chart__axis" />
        {xTicks.map((p) => (
          <text key={p.date} x={p.x} y={pad.top + innerH + 18} className="line-chart__tick" textAnchor="middle">
            {points.indexOf(p) + 1}
          </text>
        ))}
        <text x={pad.left + innerW / 2} y={height - 4} className="line-chart__tick" textAnchor="middle">{xLabel}</text>
        {active && <line x1={active.x} x2={active.x} y1={pad.top} y2={pad.top + innerH} className="line-chart__cross" />}
        <path d={path} className="line-chart__line" />
        {active && <circle cx={active.x} cy={active.y} r="4.5" className="line-chart__dot" />}
      </svg>
      {active && (
        <div className="line-chart__tip" style={{ left: Math.min(Math.max(active.x, 60), width - 60), top: Math.max(active.y - 12, 0) }}>
          <span>{formatDate(active.date, { day: 'numeric', month: 'short' })}</span>
          <strong>{formatNumber(active.count)}</strong>
        </div>
      )}
      <table className="visually-hidden">
        <caption>{label}</caption>
        <thead>
          <tr><th>Date</th><th>{valueLabel}</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}><td>{d.date}</td><td>{d.count}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
