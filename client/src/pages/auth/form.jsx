import { useCallback, useId, useRef, useState } from 'react';
import { cx } from '../../utils/cx.js';
import { isEmail, passwordProblem } from '../../utils/password.js';

export const PASSWORD_RULE = 'Use at least eight characters with at least one letter and one number.';
export const GENERAL_ERROR = 'Something went wrong. Please try again.';

export function emailProblem(value = '') {
  if (!value.trim()) return 'Enter your email address.';
  if (!isEmail(value)) return 'Enter a valid email address.';
  return '';
}

export function newPasswordProblem(value = '') {
  if (!value) return 'Enter a password.';
  return passwordProblem(value) ? PASSWORD_RULE : '';
}

const onlyFilled = (all) => Object.fromEntries(Object.entries(all).filter(([, message]) => message));

export function useForm(initial, validate = () => ({})) {
  const [values, setValues] = useState(initial);
  const [errors, setErrorsState] = useState({});
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const formRef = useRef(null);
  const valuesRef = useRef(values);
  const errorsRef = useRef(errors);
  const touched = useRef(new Set());
  const validateRef = useRef(validate);
  validateRef.current = validate;

  const setErrors = useCallback((next) => {
    const resolved = typeof next === 'function' ? next(errorsRef.current) : next;
    errorsRef.current = resolved;
    setErrorsState(resolved);
  }, []);

  const focusFirstError = useCallback(() => {
    requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
  }, []);

  const setValue = useCallback((name, value) => {
    const next = { ...valuesRef.current, [name]: value };
    valuesRef.current = next;
    touched.current.add(name);
    setValues(next);
    const shown = Object.keys(errorsRef.current).filter((key) => errorsRef.current[key]);
    if (shown.length) {
      const fresh = validateRef.current(next);
      setErrors((current) => {
        const out = { ...current };
        for (const key of shown) out[key] = fresh[key] || '';
        return out;
      });
    }
  }, [setErrors]);

  const replaceValues = useCallback((next) => {
    valuesRef.current = next;
    setValues(next);
    setErrors({});
  }, [setErrors]);

  const blur = useCallback((name) => {
    if (!touched.current.has(name) && !errorsRef.current[name]) return;
    const message = validateRef.current(valuesRef.current)[name] || '';
    setErrors((current) => ({ ...current, [name]: message }));
  }, [setErrors]);

  const field = (name) => ({
    name,
    value: values[name] ?? '',
    onChange: (value) => setValue(name, value),
    onBlur: () => blur(name),
    error: errors[name],
  });

  const submit = (handler) => async (event) => {
    event?.preventDefault?.();
    if (sending) return;
    const found = onlyFilled(validateRef.current(valuesRef.current));
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) {
      focusFirstError();
      return;
    }
    setSending(true);
    try {
      await handler(valuesRef.current);
    } catch (error) {
      if (error?.fields && Object.keys(error.fields).length) {
        setErrors(error.fields);
        focusFirstError();
      } else {
        setFormError(error?.message || GENERAL_ERROR);
      }
    } finally {
      setSending(false);
    }
  };

  return { values, errors, formError, sending, formRef, field, setValue, replaceValues, setErrors, setFormError, submit, focusFirstError };
}

export function TextField({ label, error, hint, as = 'input', labelStyle, className, onChange, id, children, ...rest }) {
  const autoId = useId();
  const inputId = id || autoId;
  const Tag = as === 'textarea' ? 'textarea' : 'input';
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cx('field', className)}>
      <label htmlFor={inputId} className={cx('field__label', labelStyle === 'caps' && 'field__label--caps')}>
        {label}
      </label>
      <Tag
        id={inputId}
        className={as === 'textarea' ? 'textarea' : 'input'}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) => onChange?.(e.target.value, e)}
        {...rest}
      />
      {children}
      {hint && !error && <p id={`${inputId}-hint`} className="field__hint">{hint}</p>}
      {error && <p id={`${inputId}-error`} className="field__error">{error}</p>}
    </div>
  );
}

export function FormError({ message, className }) {
  if (!message) return null;
  return (
    <div className={cx('form-error', className)} role="alert">
      {message}
    </div>
  );
}
