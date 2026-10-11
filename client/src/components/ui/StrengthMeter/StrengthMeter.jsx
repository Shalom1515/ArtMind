import { cx } from '../../../utils/cx.js';
import { passwordStrength, STRENGTH_LABELS } from '../../../utils/password.js';
import './StrengthMeter.css';

export default function StrengthMeter({ password = '', className }) {
  const score = passwordStrength(password);
  return (
    <div className={cx('strength', `strength--${score}`, className)} aria-live="polite">
      <div className="strength__bars" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={cx('strength__bar', n <= score && 'strength__bar--on')} />
        ))}
      </div>
      <span className="strength__label">
        {score ? <><span className="visually-hidden">Password strength: </span>{STRENGTH_LABELS[score]}</> : ''}
      </span>
    </div>
  );
}
