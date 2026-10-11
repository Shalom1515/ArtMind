import { cx } from '../../../utils/cx.js';
import './FilterChip.css';

export default function FilterChip({ children, selected = false, onToggle, disabled = false, count, className }) {
  return (
    <button
      type="button"
      className={cx('filter-chip', selected && 'filter-chip--on', className)}
      aria-pressed={selected}
      onClick={() => onToggle?.(!selected)}
      disabled={disabled}
    >
      <span>{children}</span>
      {count !== undefined && <span className="filter-chip__count">{count}</span>}
    </button>
  );
}
