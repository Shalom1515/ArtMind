import { Link } from 'react-router-dom';
import { cx } from '../../../utils/cx.js';
import Icon from '../Icon/Icon.jsx';
import './Button.css';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  icon,
  iconRight,
  loading = false,
  disabled = false,
  to,
  href,
  type = 'button',
  className,
  ...rest
}) {
  const classes = cx('btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', loading && 'btn--loading', className);
  const content = (
    <>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children && <span className="btn__label">{children}</span>}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 18} />}
      {loading && <span className="btn__spinner" aria-hidden="true" />}
    </>
  );

  if (to && !disabled) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  if (href && !disabled) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
}
