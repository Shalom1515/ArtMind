import { useRef } from 'react';
import { cx } from '../../../utils/cx.js';
import './CodeInput.css';

export default function CodeInput({ value = '', onChange, onComplete, length = 6, error, disabled, autoFocus = true, label = 'Verification code', className }) {
  const inputs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const setValue = (next) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange?.(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  const focus = (index) => inputs.current[Math.max(0, Math.min(length - 1, index))]?.focus();

  const onInput = (index, event) => {
    const typed = event.target.value.replace(/\D/g, '');
    if (!typed) return;
    if (typed.length > 1) {
      setValue(value.slice(0, index) + typed);
      focus(index + typed.length);
      return;
    }
    const at = Math.min(index, value.length);
    setValue(value.slice(0, at) + typed + value.slice(at + 1));
    focus(at + 1);
  };

  const onKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) {
        setValue(value.slice(0, index));
      } else if (index > 0) {
        setValue(value.slice(0, index - 1));
        focus(index - 1);
      }
    } else if (event.key === 'ArrowLeft') {
      focus(index - 1);
    } else if (event.key === 'ArrowRight') {
      focus(index + 1);
    }
  };

  const onPaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    event.preventDefault();
    setValue(pasted);
    focus(pasted.length);
  };

  return (
    <div className={cx('code-input', className)}>
      <div className="code-input__boxes" role="group" aria-label={label}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputs.current[index] = el)}
            className={cx('code-input__box', error && 'code-input__box--error')}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={length}
            value={digit}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={error ? true : undefined}
            onChange={(e) => onInput(index, e)}
            onKeyDown={(e) => onKeyDown(index, e)}
            onPaste={onPaste}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>
      {error && <p className="field__error code-input__error">{error}</p>}
    </div>
  );
}
