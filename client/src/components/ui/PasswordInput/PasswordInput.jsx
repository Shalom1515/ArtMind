import { useId, useState } from 'react';
import { cx } from '../../../utils/cx.js';
import Icon from '../Icon/Icon.jsx';
import './PasswordInput.css';

export default function PasswordInput({
  label = 'Password',
  value,
  onChange,
  placeholder = 'Enter your password',
  autoComplete = 'current-password',
  error,
  hint,
  id,
  name,
  required,
  disabled,
  toggle = true,
  className,
  children,
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const [visible, setVisible] = useState(false);

  return (
    <div className={cx('field', 'password-input', className)}>
      {label && (
        <label htmlFor={inputId} className="field__label">
          {label}
        </label>
      )}
      <div className="password-input__box">
        <input
          id={inputId}
          name={name}
          className="input"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange?.(e.target.value, e)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        />
        {toggle && (
          <button
            type="button"
            className="password-input__eye"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            <Icon name={visible ? 'eyeOff' : 'eye'} size={20} />
          </button>
        )}
      </div>
      {children}
      {hint && !error && <p id={`${inputId}-hint`} className="field__hint">{hint}</p>}
      {error && <p id={`${inputId}-error`} className="field__error">{error}</p>}
    </div>
  );
}
