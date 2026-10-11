import { useId } from 'react';
import { cx } from '../../../utils/cx.js';
import Icon from '../Icon/Icon.jsx';
import './Checkbox.css';

export default function Checkbox({ label, checked = false, onChange, count, disabled, error, id, name, className, children }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={cx('checkbox', disabled && 'checkbox--disabled', className)}>
      <label htmlFor={inputId} className="checkbox__row">
        <input
          id={inputId}
          name={name}
          type="checkbox"
          className="checkbox__input"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked, e)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        <span className="checkbox__box" aria-hidden="true">
          <Icon name="check" size={13} strokeWidth={2.4} />
        </span>
        <span className="checkbox__label">{label ?? children}</span>
        {count !== undefined && <span className="checkbox__count">{count}</span>}
      </label>
      {error && <p id={`${inputId}-error`} className="field__error">{error}</p>}
    </div>
  );
}
