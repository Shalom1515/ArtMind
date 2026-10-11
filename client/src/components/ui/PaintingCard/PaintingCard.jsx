import { Link } from 'react-router-dom';
import { useFavourites } from '../../../context/FavouritesContext.jsx';
import { cx } from '../../../utils/cx.js';
import FramedImage from '../FramedImage/FramedImage.jsx';
import Icon from '../Icon/Icon.jsx';
import './PaintingCard.css';

export default function PaintingCard({
  painting,
  ratio = '4 / 3',
  fit = 'cover',
  showCategory = true,
  showArtist = true,
  showYear = true,
  showHeart = true,
  reason,
  size = 'md',
  headingLevel = 3,
  className,
  children,
}) {
  const { isSaved, toggle } = useFavourites();
  if (!painting) return null;
  const saved = isSaved(painting.slug);
  const href = `/paintings/${painting.slug}`;
  const Heading = `h${headingLevel}`;

  return (
    <article className={cx('painting-card', `painting-card--${size}`, className)}>
      <div className="painting-card__media">
        <Link to={href} className="painting-card__image-link" tabIndex={-1} aria-hidden="true">
          <FramedImage src={painting.image} alt="" tones={painting.tones} ratio={ratio} fit={fit} frame="mat" />
        </Link>
        {showHeart && (
          <button
            type="button"
            className={cx('painting-card__heart', saved && 'painting-card__heart--on')}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${painting.title} from favourites` : `Save ${painting.title} to favourites`}
            onClick={() => toggle(painting)}
          >
            <Icon name="heart" size={16} filled={saved} />
          </button>
        )}
      </div>
      <div className="painting-card__body">
        {showCategory && painting.category && <span className="label painting-card__category">{painting.category}</span>}
        <Heading className="painting-card__title">
          <Link to={href}>{painting.title}</Link>
        </Heading>
        {(showArtist || showYear) && (
          <p className="painting-card__meta">
            {showArtist && <span>{painting.artist?.name}</span>}
            {showYear && painting.year && <span>{painting.year}</span>}
          </p>
        )}
        {reason && <p className="painting-card__reason">{reason}</p>}
        {children}
      </div>
    </article>
  );
}
