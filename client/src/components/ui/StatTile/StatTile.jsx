import { cx } from '../../../utils/cx.js';
import { formatNumber } from '../../../utils/format.js';
import './StatTile.css';

export default function StatTile({ value, label, variant = 'box', loading = false, className }) {
  return (
    <div className={cx('stat-tile', `stat-tile--${variant}`, className)}>
      <span className="stat-tile__value">{loading ? '...' : typeof value === 'number' ? formatNumber(value) : value}</span>
      <span className="stat-tile__label">{label}</span>
    </div>
  );
}
