import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getArtist } from '../../../api/artists.js';
import ArtistCard from '../../../components/ui/ArtistCard/ArtistCard.jsx';
import Avatar from '../../../components/ui/Avatar/Avatar.jsx';
import Carousel from '../../../components/ui/Carousel/Carousel.jsx';
import Chip from '../../../components/ui/Chip/Chip.jsx';
import { ErrorState } from '../../../components/ui/EmptyState/EmptyState.jsx';
import PaintingCard from '../../../components/ui/PaintingCard/PaintingCard.jsx';
import Skeleton, { Loading } from '../../../components/ui/Skeleton/Skeleton.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { useIsPhone } from '../../../hooks/useMediaQuery.js';
import NotFound from '../NotFound/NotFound.jsx';
import './ArtistProfile.css';

export default function ArtistProfile() {
  const { slug } = useParams();
  const isPhone = useIsPhone();
  const worksHeading = useRef(null);
  const { data, error, loading, reload } = useApi(() => getArtist(slug), [slug]);
  const artist = data?.artist;
  useDocumentTitle(artist?.name || (error?.status === 404 ? 'Page not found' : 'Artist'));

  if (error?.status === 404) return <NotFound />;
  if (error) {
    return (
      <div className="container section">
        <ErrorState error={error} onRetry={reload} title="We could not load this artist." />
      </div>
    );
  }
  if (loading && !artist) {
    return (
      <Loading label="Loading the artist" className="page-artist__band">
        <div className="container page-artist__header">
          <Skeleton variant="circle" width={isPhone ? 160 : 190} />
          <div className="page-artist__header-text">
            <Skeleton height={44} width="70%" />
            <Skeleton variant="text" lines={2} className="mt-4" />
          </div>
        </div>
      </Loading>
    );
  }

  const paintings = data.paintings || [];
  const similar = data.similar || [];
  const bio = (artist.bio || '').split(/\n\s*\n/).filter(Boolean);
  const worksLabel = `${paintings.length} ${paintings.length === 1 ? 'work' : 'works'} in ArtMind`;

  const goToWorks = (event) => {
    event.preventDefault();
    const heading = worksHeading.current;
    if (!heading) return;
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    heading.focus({ preventScroll: true });
  };

  const similarCards = similar.map((a) => <ArtistCard key={a.slug} artist={a} variant="compact" />);

  return (
    <div className="page-artist">
      <section className="page-artist__band">
        <div className="container page-artist__header">
          <Avatar src={artist.portrait} name={artist.name} size={190} className="page-artist__portrait" />
          <div className="page-artist__header-text">
            <h1 className="page-artist__name">{artist.name}</h1>
            <p className="page-artist__origin">
              {artist.country}, born {artist.bornYear}
            </p>
            {artist.styles?.length > 0 && (
              <ul className="page-artist__styles" aria-label="Styles">
                {artist.styles.map((style) => (
                  <li key={style}>
                    <Chip variant="box">{style}</Chip>
                  </li>
                ))}
              </ul>
            )}
            <a href="#works" className="caps-link page-artist__works-link" onClick={goToWorks}>{worksLabel}</a>
          </div>
        </div>
      </section>

      <div className="container page-artist__body">
        <section className="page-artist__section" aria-labelledby="bioTitle">
          <span className="label eyebrow" aria-hidden="true">Biography</span>
          <h2 id="bioTitle" className="page-artist__heading">Biography</h2>
          <div className="page-artist__bio">
            {bio.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="page-artist__section" id="works" aria-labelledby="worksTitle">
          <span className="label eyebrow" aria-hidden="true">Works</span>
          <h2 id="worksTitle" className="page-artist__heading" ref={worksHeading} tabIndex={-1}>Works</h2>
          <div className="grid grid--3 page-artist__works">
            {paintings.map((p) => (
              <PaintingCard key={p.slug} painting={p} showCategory={false} showArtist={false} showYear={false} size="lg" />
            ))}
          </div>
        </section>

        {similar.length > 0 && (
          <section className="page-artist__section" aria-labelledby="similarTitle">
            <span className="label eyebrow" aria-hidden="true">Similar artists</span>
            <h2 id="similarTitle" className="page-artist__heading">Similar artists</h2>
            {isPhone ? (
              <Carousel itemWidth="46%" gap={12} label="Similar artists">{similarCards}</Carousel>
            ) : (
              <div className="page-artist__similar">{similarCards}</div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
