import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../../utils/cx.js';
import './Logo.css';

export default function Logo({ tone = 'dark', suffix, to = '/', size = 'md', className }) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = tone === 'light' ? '/brand/logo_light.png' : '/brand/logo.png';
  const useImage = !suffix && !imageFailed;

  return (
    <Link to={to} className={cx('logo', `logo--${tone}`, `logo--${size}`, className)} aria-label={suffix ? `ArtMind ${suffix}, home` : 'ArtMind home'}>
      {useImage ? (
        <img src={src} alt="ArtMind" className="logo__image" onError={() => setImageFailed(true)} />
      ) : (
        <>
          <LogoMark />
          <span className="logo__word">
            ArtMind{suffix && <span className="logo__suffix"> {suffix}</span>}
          </span>
        </>
      )}
    </Link>
  );
}

export function LogoMark({ className }) {
  return (
    <svg className={cx('logo__mark', className)} viewBox="0 0 24 28" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="22" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4.5" y="4.5" width="15" height="19" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M1 1l3.5 3.5M23 1l-3.5 3.5M1 27l3.5-3.5M23 27l-3.5-3.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
