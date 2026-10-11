import { cx } from '../../../utils/cx.js';
import './Toggle.css';

export default function Toggle({ checked = false, onChange, label, showLabel = false, disabled, busy, className }) {
  return (
    <label className={cx('toggle', disabled && 'toggle--disabled', className)}>
      <input
        type="checkbox"
        role="switch"
        className="toggle__input"
        checked={checked}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
      <span className={showLabel ? 'toggle__label' : 'visually-hidden'}>{label}</span>
    </label>
  );
}
