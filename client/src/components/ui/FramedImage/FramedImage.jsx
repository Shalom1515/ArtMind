import { useState } from 'react';
import { cx } from '../../../utils/cx.js';
import { placeholderBackground } from '../../../utils/placeholder.js';
import './FramedImage.css';

export default function FramedImage({
  src,
  alt,
  tones,
  ratio,
  frame = 'none',
  fit = 'cover',
  caption,
  loading = 'lazy',
  className,
  children,
}) {
  const [state, setState] = useState(src ? 'loading' : 'missing');

  return (
    <figure className={cx('framed', `framed--${frame}`, className)}>
      <div className="framed__mat">
        <div
          className={cx('framed__box', !ratio && state !== 'loaded' && 'framed__box--fallback')}
          style={{ aspectRatio: ratio, background: placeholderBackground(tones) }}
        >
          {src && state !== 'missing' && (
            <img
              src={src}
              alt={alt}
              loading={loading}
              decoding="async"
              className={cx('framed__img', `framed__img--${fit}`, state === 'loaded' && 'framed__img--in')}
              onLoad={() => setState('loaded')}
              onError={() => setState('missing')}
            />
          )}
          {state === 'missing' && alt && <span className="visually-hidden">{alt}</span>}
          {children}
        </div>
      </div>
      {caption && <figcaption className="framed__caption">{caption}</figcaption>}
    </figure>
  );
}
