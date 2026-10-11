import { useState } from 'react';
import { cx } from '../../../utils/cx.js';
import { initials } from '../../../utils/format.js';
import './Avatar.css';

export default function Avatar({ src, name = '', size = 40, className }) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;
  return (
    <span
      className={cx('avatar', className)}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)) }}
      aria-hidden={name ? undefined : true}
    >
      {showImage ? (
        <img src={src} alt={name ? `${name}` : ''} onError={() => setFailed(true)} />
      ) : (
        <span className="avatar__initials" aria-label={name || undefined}>{initials(name)}</span>
      )}
    </span>
  );
}
