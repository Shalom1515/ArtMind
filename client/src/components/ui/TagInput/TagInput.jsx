import { useId, useState } from 'react';
import { cx } from '../../../utils/cx.js';
import Icon from '../Icon/Icon.jsx';
import './TagInput.css';

export default function TagInput({ label, value = [], onChange, placeholder = 'Add a tag', max = 12, error, hint, labelStyle, id, className }) {
  const autoId = useId();
  const inputId = id || autoId;
  const [draft, setDraft] = useState('');

  const add = (text) => {
    const tag = text.trim().replace(/,$/, '').trim().toLowerCase();
    if (!tag || value.includes(tag) || value.length >= max) {
      setDraft('');
      return;
    }
    onChange?.([...value, tag]);
    setDraft('');
  };

  const remove = (tag) => onChange?.(value.filter((t) => t !== tag));

  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(draft);
    } else if (event.key === 'Backspace' && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div className={cx('field', 'tag-input', className)}>
      {label && (
        <label htmlFor={inputId} className={cx('field__label', labelStyle === 'caps' && 'field__label--caps')}>
          {label}
        </label>
      )}
      <div className={cx('tag-input__box', error && 'tag-input__box--error')}>
        <ul className="tag-input__tags">
          {value.map((tag) => (
            <li key={tag} className="tag-input__tag">
              <span>{tag}</span>
              <button type="button" onClick={() => remove(tag)} aria-label={`Remove ${tag}`}>
                <Icon name="close" size={11} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
        <input
          id={inputId}
          className="tag-input__field"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft && add(draft)}
          placeholder={value.length >= max ? '' : placeholder}
          disabled={value.length >= max}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        />
      </div>
      {hint && !error && <p id={`${inputId}-hint`} className="field__hint">{hint}</p>}
      {error && <p id={`${inputId}-error`} className="field__error">{error}</p>}
    </div>
  );
}
