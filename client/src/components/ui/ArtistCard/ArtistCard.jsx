import { Link } from 'react-router-dom';
import { cx } from '../../../utils/cx.js';
import { plural } from '../../../utils/format.js';
import Avatar from '../Avatar/Avatar.jsx';
import Chip from '../Chip/Chip.jsx';
import './ArtistCard.css';

export default function ArtistCard({ artist, variant = 'full', className }) {
  if (!artist) return null;
  const href = `/artists/${artist.slug}`;

  if (variant === 'compact') {
    return (
      <Link to={href} className={cx('artist-card', 'artist-card--compact', className)}>
        <Avatar src={artist.portrait} name={artist.name} size={96} />
        <span className="artist-card__name">{artist.name}</span>
      </Link>
    );
  }

  return (
    <article className={cx('artist-card', 'artist-card--full', className)}>
      <Link to={href} className="artist-card__portrait" tabIndex={-1} aria-hidden="true">
        <Avatar src={artist.portrait} name={artist.name} size={112} />
      </Link>
      <div className="artist-card__text">
        <h3 className="artist-card__name">
          <Link to={href}>{artist.name}</Link>
        </h3>
        <p className="artist-card__origin">
          {artist.country}, born {artist.bornYear}
        </p>
        {artist.styles?.length > 0 && (
          <ul className="artist-card__styles" aria-label="Styles">
            {artist.styles.map((style) => (
              <li key={style}>
                <Chip variant="box" size="sm">{style}</Chip>
              </li>
            ))}
          </ul>
        )}
        {artist.works !== undefined && <p className="artist-card__works">{plural(artist.works, 'work')}</p>}
      </div>
    </article>
  );
}
