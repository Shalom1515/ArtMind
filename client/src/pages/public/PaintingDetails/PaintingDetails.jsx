import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { USE_MOCK } from '../../../api/client.js';
import { downloadPainting, getMoreByArtist, getPainting, getSimilar, recordView } from '../../../api/paintings.js';
import Breadcrumb from '../../../components/ui/Breadcrumb/Breadcrumb.jsx';
import Button from '../../../components/ui/Button/Button.jsx';
import Carousel from '../../../components/ui/Carousel/Carousel.jsx';
import Chip from '../../../components/ui/Chip/Chip.jsx';
import { ErrorState } from '../../../components/ui/EmptyState/EmptyState.jsx';
import FramedImage from '../../../components/ui/FramedImage/FramedImage.jsx';
import Icon from '../../../components/ui/Icon/Icon.jsx';
import Modal from '../../../components/ui/Modal/Modal.jsx';
import PaintingCard from '../../../components/ui/PaintingCard/PaintingCard.jsx';
import Skeleton, { Loading, SkeletonGrid } from '../../../components/ui/Skeleton/Skeleton.jsx';
import Swatch from '../../../components/ui/Swatch/Swatch.jsx';
import { useChat } from '../../../context/ChatContext.jsx';
import { useFavourites } from '../../../context/FavouritesContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { useIsPhone } from '../../../hooks/useMediaQuery.js';
import { cx } from '../../../utils/cx.js';
import { formatSize } from '../../../utils/format.js';
import NotFound from '../NotFound/NotFound.jsx';
import './PaintingDetails.css';

const WALL_IMAGE = '/images/room/wall.jpg';
const BENCH_CM = 180;
// Share of the wall.jpg width taken by the bench. 0.4 until wall.jpg is added and measured.
const BENCH_SHARE = 0.4;
// Height in the wall image, as a share from the top, where the painting's bottom edge hangs.
const HANG_LINE = 0.6;

function WallView({ painting }) {
  const [photo, setPhoto] = useState('loading');

  useEffect(() => {
    const img = new Image();
    img.onload = () => setPhoto('ready');
    img.onerror = () => setPhoto('missing');
    img.src = WALL_IMAGE;
  }, []);

  const widthShare = ((painting.widthCm || 60) / BENCH_CM) * BENCH_SHARE;
  const ratio = `${painting.widthCm || 4} / ${painting.heightCm || 3}`;

  return (
    <div
      className={cx('page-painting__wall', photo === 'ready' && 'page-painting__wall--photo')}
      style={photo === 'ready' ? { backgroundImage: `url(${WALL_IMAGE})` } : undefined}
      role="img"
      aria-label={`${painting.title} shown on a wall above a 180 cm bench, at true scale`}
    >
      {photo !== 'ready' && <span className="page-painting__bench" style={{ width: `${BENCH_SHARE * 100}%` }} aria-hidden="true" />}
      <div className="page-painting__hung" style={{ width: `${widthShare * 100}%`, bottom: `${(1 - HANG_LINE) * 100}%` }}>
        <FramedImage src={painting.image} alt="" tones={painting.tones} ratio={ratio} frame="gallery" />
      </div>
    </div>
  );
}

function ActionButton({ icon, filled, label, onClick, pressed, busy }) {
  return (
    <button
      type="button"
      className={cx('page-painting__action', pressed && 'page-painting__action--on')}
      onClick={onClick}
      aria-pressed={pressed}
      aria-busy={busy || undefined}
      disabled={busy}
    >
      <Icon name={icon} size={20} filled={filled} />
      <span>{label}</span>
    </button>
  );
}

function RelatedRow({ title, items, isPhone, id }) {
  if (!items?.length) return null;
  const cards = items.map((p) => <PaintingCard key={p.slug} painting={p} showCategory={false} size="sm" />);
  return (
    <section className="page-painting__related" aria-labelledby={id}>
      <h2 id={id} className="page-painting__related-title">{title}</h2>
      {isPhone ? (
        <Carousel itemWidth="46%" gap={12} label={title}>{cards}</Carousel>
      ) : (
        <div className="grid grid--4">{cards}</div>
      )}
    </section>
  );
}

function DetailsLoading() {
  return (
    <Loading label="Loading the painting" className="container page-painting__top">
      <div className="page-painting__layout">
        <Skeleton className="page-painting__image-skeleton" />
        <Skeleton variant="text" lines={8} />
      </div>
    </Loading>
  );
}

export default function PaintingDetails() {
  const { slug } = useParams();
  const isPhone = useIsPhone();
  const toast = useToast();
  const { open } = useChat();
  const { isSaved, toggle } = useFavourites();
  const [view, setView] = useState('painting');
  const [zoomed, setZoomed] = useState(false);
  const [busy, setBusy] = useState('');
  const viewed = useRef('');

  const { data, error, loading, reload } = useApi(() => getPainting(slug), [slug]);
  const similar = useApi(() => getSimilar(slug, 4), [slug]);
  const more = useApi(() => getMoreByArtist(slug, 4), [slug]);
  const painting = data?.painting;
  useDocumentTitle(painting?.title || (error?.status === 404 ? 'Page not found' : 'Painting'));

  useEffect(() => {
    setView('painting');
    setZoomed(false);
  }, [slug]);

  useEffect(() => {
    if (!painting || viewed.current === painting.slug) return;
    viewed.current = painting.slug;
    recordView(painting.slug).catch(() => {});
  }, [painting]);

  if (error?.status === 404) return <NotFound />;
  if (loading && !painting) return <DetailsLoading />;
  if (error || !painting) {
    return (
      <div className="container section">
        <ErrorState error={error} onRetry={reload} title="We could not load this painting." />
      </div>
    );
  }

  const saved = isSaved(painting.slug);
  const palette = painting.palette?.length ? painting.palette : painting.tones || [];
  const facts = [
    ['Style', painting.style],
    ['Medium', painting.medium],
    ['Surface', painting.surface],
    ['Size', formatSize(painting)],
    ['Year', painting.year],
  ];

  const download = async (format) => {
    if (USE_MOCK) {
      toast.info('Downloads work when the server is running');
      return;
    }
    setBusy(format);
    try {
      await downloadPainting(painting.slug, format);
    } catch (err) {
      toast.error(err.message || 'The download did not work. Please try again.');
    } finally {
      setBusy('');
    }
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${painting.title} | ArtMind`, url });
      } catch {
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied. You can paste it anywhere.');
    } catch {
      toast.error('We could not copy the link. Please copy it from the address bar.');
    }
  };

  return (
    <div className="page-painting">
      <div className="container page-painting__top">
        <Breadcrumb
          className="page-painting__crumbs"
          items={[
            { label: 'Gallery', to: '/gallery' },
            { label: painting.category, to: `/gallery?category=${encodeURIComponent(painting.category)}` },
            { label: painting.title },
          ]}
        />

        <div className="page-painting__layout">
          <div className="page-painting__media">
            {view === 'painting' ? (
              <div className="page-painting__frame">
                <FramedImage
                  src={painting.image}
                  alt={`${painting.title} by ${painting.artist?.name}`}
                  tones={painting.tones}
                  ratio={painting.widthCm && painting.heightCm ? `${painting.widthCm} / ${painting.heightCm}` : '4 / 3'}
                  frame="mat"
                  loading="eager"
                />
                <button type="button" className="page-painting__zoom" onClick={() => setZoomed(true)} aria-label={`Zoom in on ${painting.title}`} aria-haspopup="dialog">
                  <Icon name="zoom" size={18} />
                </button>
              </div>
            ) : (
              <WallView painting={painting} />
            )}
            <div className="page-painting__views" role="group" aria-label="How to show the painting">
              <button type="button" className={cx('page-painting__view', view === 'painting' && 'page-painting__view--on')} aria-pressed={view === 'painting'} onClick={() => setView('painting')}>
                Painting
              </button>
              <button type="button" className={cx('page-painting__view', view === 'wall' && 'page-painting__view--on')} aria-pressed={view === 'wall'} onClick={() => setView('wall')}>
                View on a wall
              </button>
            </div>
          </div>

          <div className="page-painting__info">
            <h1 className="page-painting__title">{painting.title}</h1>
            <p className="page-painting__by">
              <Link to={`/artists/${painting.artist.slug}`} className="page-painting__artist">{painting.artist.name}</Link>
              <span className="page-painting__year">{painting.year}</span>
            </p>
            <p className="page-painting__labels">
              <span className="label">{painting.category}</span>
              <span className="label">{painting.style}</span>
            </p>
            <dl className="facts page-painting__facts">
              {facts.map(([term, value]) => (
                <div key={term} className="page-painting__fact">
                  <dt>{term}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="page-painting__actions">
              <ActionButton
                icon="heart"
                filled={saved}
                pressed={saved}
                label={saved ? 'Saved' : 'Save to favourites'}
                onClick={() => toggle(painting)}
              />
              <ActionButton icon="download" label="Download PDF" busy={busy === 'pdf'} onClick={() => download('pdf')} />
              <ActionButton icon="file" label="Download Word" busy={busy === 'docx'} onClick={() => download('docx')} />
              <ActionButton icon="share" label="Share" onClick={share} />
            </div>
            <p className="page-painting__description">{painting.description}</p>
          </div>
        </div>
      </div>

      <section className="page-painting__band" aria-label="Summary, tags and colour palette">
        <div className="container page-painting__band-inner">
          <div className="page-painting__summary">
            <h2 className="label eyebrow">Summary</h2>
            <p className="page-painting__summary-text">{painting.summary}</p>
          </div>
          <div className="page-painting__palette">
            <h2 className="label eyebrow">Colour palette</h2>
            <ul className="page-painting__swatches">
              {palette.map((hex) => (
                <li key={hex}>
                  <Swatch colour={hex} showHex size="fill" />
                </li>
              ))}
            </ul>
          </div>
          {painting.tags?.length > 0 && (
            <div className="page-painting__tags">
              <h2 className="label eyebrow">Tags</h2>
              <ul className="cluster">
                {painting.tags.map((tag) => (
                  <li key={tag}>
                    <Chip variant="tag" size="sm" to={`/search?q=${encodeURIComponent(tag)}`}>{tag}</Chip>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <div className="container page-painting__more">
        {similar.loading && !similar.data ? (
          <SkeletonGrid count={4} className="grid grid--4" label="Loading similar paintings" />
        ) : (
          <RelatedRow id="similarTitle" title="Similar paintings" items={similar.data?.items} isPhone={isPhone} />
        )}
        <RelatedRow id="moreTitle" title={`More from ${painting.artist.name}`} items={more.data?.items} isPhone={isPhone} />
      </div>

      <section className="page-painting__ask">
        <div className="container page-painting__ask-inner">
          <h2 className="page-painting__ask-title">Have a question about this painting?</h2>
          <Button variant="light" onClick={() => open({ painting })} aria-haspopup="dialog">Ask the assistant</Button>
        </div>
      </section>

      <Modal open={zoomed} onClose={() => setZoomed(false)} title={painting.title} size="lg" className="page-painting__lightbox">
        <FramedImage
          src={painting.image}
          alt={`${painting.title} by ${painting.artist.name}`}
          tones={painting.tones}
          ratio={`${painting.widthCm || 4} / ${painting.heightCm || 3}`}
          fit="contain"
          loading="eager"
          className="page-painting__lightbox-image"
        />
      </Modal>
    </div>
  );
}
