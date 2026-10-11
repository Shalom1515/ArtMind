import { cx } from '../../../utils/cx.js';
import './Skeleton.css';

export default function Skeleton({ variant = 'block', width, height, lines = 3, ratio = '4 / 3', className }) {
  if (variant === 'text') {
    return (
      <div className={cx('skeleton-text', className)} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span key={i} className="skeleton" style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }} />
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cx('skeleton-card', className)} aria-hidden="true">
        <span className="skeleton skeleton-card__image" style={{ aspectRatio: ratio }} />
        <span className="skeleton skeleton-card__line" style={{ width: '40%' }} />
        <span className="skeleton skeleton-card__line" style={{ width: '80%' }} />
        <span className="skeleton skeleton-card__line" style={{ width: '60%' }} />
      </div>
    );
  }

  return (
    <span
      className={cx('skeleton', variant === 'circle' && 'skeleton--circle', className)}
      style={{ width, height: height ?? (variant === 'circle' ? width : undefined) }}
      aria-hidden="true"
    />
  );
}

export function Loading({ label = 'Loading', children, className }) {
  return (
    <div className={className} role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {children}
    </div>
  );
}

export function SkeletonGrid({ count = 8, ratio = '4 / 3', label = 'Loading paintings', className }) {
  return (
    <Loading label={label} className={className}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} variant="card" ratio={ratio} />
      ))}
    </Loading>
  );
}
