import { useId } from 'react';
import { cx } from '../../../utils/cx.js';
import Icon from '../Icon/Icon.jsx';
import './Select.css';

export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  prefix,
  error,
  hint,
  id,
  name,
  disabled,
  required,
  size = 'md',
  labelStyle,
  className,
}) {
  const autoId = useId();
  const selectId = id || autoId;
  const normalised = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  const current = normalised.find((o) => String(o.value) === String(value));

  return (
    <div className={cx('field', 'select', `select--${size}`, className)}>
      {label && (
        <label htmlFor={selectId} className={cx('field__label', labelStyle === 'caps' && 'field__label--caps')}>
          {label}
        </label>
      )}
      <div className={cx('select__box', error && 'select__box--error', disabled && 'select__box--disabled')}>
        {prefix && <span className="select__prefix" aria-hidden="true">{prefix}</span>}
        <span className={cx('select__value', !current && 'select__value--placeholder')} aria-hidden="true">
          {current ? current.label : placeholder || 'Choose'}
        </span>
        <Icon name="chevronDown" size={16} className="select__chevron" />
        <select
          id={selectId}
          name={name}
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value, e)}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          aria-label={!label ? prefix ? `${prefix} ${current?.label || ''}`.trim() : placeholder : undefined}
        >
          {(placeholder || !current) && (
            <option value="" disabled={required}>
              {placeholder || 'Choose'}
            </option>
          )}
          {normalised.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {hint && !error && <p id={`${selectId}-hint`} className="field__hint">{hint}</p>}
      {error && <p id={`${selectId}-error`} className="field__error">{error}</p>}
    </div>
  );
}
