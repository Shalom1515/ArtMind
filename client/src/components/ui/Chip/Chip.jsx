import { Link } from 'react-router-dom';
import { cx } from '../../../utils/cx.js';
import Icon from '../Icon/Icon.jsx';
import './Chip.css';

export default function Chip({ children, variant = 'box', size = 'md', onRemove, removeLabel, onClick, to, className }) {
  const classes = cx('chip', `chip--${variant}`, `chip--${size}`, (onClick || to) && 'chip--action', className);

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    );
  }

  if (onClick && !onRemove) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {children}
      </button>
    );
  }

  return (
    <span className={classes}>
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          className="chip__remove"
          onClick={onRemove}
          aria-label={removeLabel || `Remove ${typeof children === 'string' ? children : 'this'}`}
        >
          <Icon name="close" size={12} strokeWidth={2} />
        </button>
      )}
    </span>
  );
}
