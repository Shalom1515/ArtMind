import { Link } from 'react-router-dom';
import { cx } from '../../../utils/cx.js';
import { plural } from '../../../utils/format.js';
import FramedImage from '../FramedImage/FramedImage.jsx';
import './CollectionCard.css';

export default function CollectionCard({ collection, variant = 'mosaic', reason, to, className }) {
  if (!collection) return null;
  const href = to || (collection.slug ? `/collections/${collection.slug}` : undefined);
  const covers = (collection.covers || collection.paintings || []).slice(0, variant === 'strip' ? 3 : 4);
  const count = collection.count ?? collection.paintings?.length;
  const Wrapper = href ? Link : 'div';

  return (
    <Wrapper to={href} className={cx('collection-card', `collection-card--${variant}`, className)}>
      <div className="collection-card__mosaic" aria-hidden="true">
        {covers.map((p) => (
          <FramedImage key={p.slug} src={p.image} alt="" tones={p.tones} ratio={variant === 'mosaic' ? '1 / 1' : '4 / 3'} />
        ))}
      </div>
      <div className="collection-card__text">
        <h3 className="collection-card__title">{collection.title}</h3>
        {variant === 'mosaic' && collection.shortLine && <p className="collection-card__line">{collection.shortLine}</p>}
        {reason && <p className="collection-card__reason">{reason}</p>}
        {!reason && count !== undefined && <p className="collection-card__count">{plural(count, 'painting')}</p>}
      </div>
    </Wrapper>
  );
}
