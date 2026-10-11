import { cx } from '../../../utils/cx.js';
import { formatNumber } from '../../../utils/format.js';
import './BarList.css';

export default function BarList({ items = [], max, label = 'Values', className }) {
  const top = max || Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cx('bar-list', className)} aria-label={label}>
      {items.map((item) => (
        <li key={item.label} className="bar-list__row" title={`${item.label}: ${formatNumber(item.value)}`}>
          <span className="bar-list__label">{item.label}</span>
          <span className="bar-list__track" aria-hidden="true">
            <span className="bar-list__bar" style={{ width: `${Math.max(2, (item.value / top) * 100)}%` }} />
          </span>
          <span className="bar-list__value">{formatNumber(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}
