import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getHome } from '../../../api/paintings.js';
import Avatar from '../../../components/ui/Avatar/Avatar.jsx';
import Button from '../../../components/ui/Button/Button.jsx';
import Carousel from '../../../components/ui/Carousel/Carousel.jsx';
import Chip from '../../../components/ui/Chip/Chip.jsx';
import CollectionCard from '../../../components/ui/CollectionCard/CollectionCard.jsx';
import { ErrorState } from '../../../components/ui/EmptyState/EmptyState.jsx';
import FramedImage from '../../../components/ui/FramedImage/FramedImage.jsx';
import Icon from '../../../components/ui/Icon/Icon.jsx';
import PaintingCard from '../../../components/ui/PaintingCard/PaintingCard.jsx';
import Skeleton, { SkeletonGrid } from '../../../components/ui/Skeleton/Skeleton.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useChat } from '../../../context/ChatContext.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { useMediaQuery } from '../../../hooks/useMediaQuery.js';
import { caption } from '../../../utils/format.js';
import './Home.css';

const SUGGESTIONS = ['calm landscapes', 'abstract with warm colours', 'religious paintings on wood panel'];

function HomeSearch({ suggestions }) {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const go = (q) => navigate(`/search?q=${encodeURIComponent(q)}`);

  const submit = (event) => {
    event.preventDefault();
    const q = text.trim();
    if (q) go(q);
  };

  return (
    <section className="page-home__search" aria-label="Search the gallery">
      <div className="container">
        <form role="search" className="page-home__search-form" onSubmit={submit}>
          <label htmlFor="homeSearch" className="visually-hidden">Describe the painting you would like to see</label>
          <input
            id="homeSearch"
            type="search"
            className="input page-home__search-input"
            placeholder="Try: calm landscapes with soft light"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            enterKeyHint="search"
          />
          <button type="submit" className="page-home__search-button" aria-label="Search">
            <Icon name="search" size={18} />
          </button>
        </form>
        <ul className="page-home__suggestions" aria-label="Try one of these">
          {suggestions.map((q) => (
            <li key={q}>
              <Chip size="sm" variant="box" to={`/search?q=${encodeURIComponent(q)}`}>{q}</Chip>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Hero({ hero, loading }) {
  return (
    <section className="page-home__hero container">
      <div className="page-home__hero-text">
        <span className="label eyebrow">A smarter painting gallery</span>
        <h1 className="page-home__title">
          Find the painting that was <em>made for you.</em>
        </h1>
        <p className="page-home__intro">
          Explore a curated gallery, search the way you speak, get recommendations built on your taste, and ask an assistant that
          knows every painting here.
        </p>
        <div className="page-home__hero-buttons">
          <Button to="/gallery">Explore the gallery</Button>
          <Button to="/identify" variant="secondary">Identify a style</Button>
        </div>
      </div>
      <div className="page-home__hero-art">
        {loading && <Skeleton ratio="3 / 2" className="page-home__hero-skeleton" />}
        {hero && (
          <Link to={`/paintings/${hero.slug}`} className="page-home__hero-link">
            <FramedImage
              src={hero.image}
              alt={`${hero.title} by ${hero.artist?.name}`}
              tones={hero.tones}
              ratio="3 / 2"
              frame="gallery"
              loading="eager"
              caption={caption(hero)}
            />
          </Link>
        )}
      </div>
    </section>
  );
}

function Categories({ categories }) {
  return (
    <section className="section page-home__categories container" aria-labelledby="homeCategories">
      <span className="label eyebrow">Categories</span>
      <h2 id="homeCategories" className="page-home__heading">Browse by category</h2>
      <ul className="page-home__category-grid">
        {categories.map((c) => (
          <li key={c.name}>
            <Link to={`/gallery?category=${encodeURIComponent(c.name)}`} className="page-home__category">
              <FramedImage src={c.image} alt="" ratio="4 / 3" frame="mat" />
              <span className="page-home__category-name">{c.name}</span>
              <span className="page-home__category-count">
                {c.count}
                <span className="visually-hidden"> paintings</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Trending({ items }) {
  const phone = useMediaQuery('(max-width: 639px)');
  const tablet = useMediaQuery('(max-width: 1023px)');
  const width = phone ? '30%' : tablet ? '22%' : 'calc((100% - 80px) / 6)';
  return (
    <section className="page-home__trending container" aria-labelledby="homeTrending">
      <h2 id="homeTrending" className="page-home__heading">Trending this week</h2>
      <Carousel itemWidth={width} label="Trending this week">
        {items.map((p) => (
          <Link key={p.slug} to={`/paintings/${p.slug}`} className="page-home__trend" aria-label={`${p.title} by ${p.artist?.name}`}>
            <FramedImage src={p.image} alt={p.title} tones={p.tones} ratio="5 / 3" />
          </Link>
        ))}
      </Carousel>
    </section>
  );
}

function Helps() {
  const { user } = useAuth();
  const { open } = useChat();
  const items = [
    { icon: 'compass', title: 'Recommendations', text: 'Picked from what you view and save.', to: user ? '/dashboard' : '/register' },
    { icon: 'search', title: 'Smart search', text: 'Describe a painting in a sentence.', to: '/search' },
    { icon: 'frame', title: 'Style recognition', text: 'Upload a painting and learn its style.', to: '/identify' },
    { icon: 'chat', title: 'Art assistant', text: 'Ask about any painting or artist.', onClick: () => open() },
  ];
  return (
    <section className="page-home__helps" aria-labelledby="homeHelps">
      <div className="container">
        <h2 id="homeHelps" className="label eyebrow">How ArtMind helps</h2>
        <ul className="page-home__help-grid">
          {items.map((item) => {
            const body = (
              <>
                <Icon name={item.icon} size={26} className="page-home__help-icon" />
                <span className="page-home__help-title">{item.title}</span>
                <span className="page-home__help-text">{item.text}</span>
              </>
            );
            return (
              <li key={item.title}>
                {item.to ? (
                  <Link to={item.to} className="page-home__help">{body}</Link>
                ) : (
                  <button type="button" className="page-home__help" onClick={item.onClick} aria-haspopup="dialog">{body}</button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function FeaturedArtist({ data }) {
  const { artist, bio, paintings = [] } = data;
  return (
    <section className="page-home__artist container" aria-labelledby="homeArtist">
      <h2 id="homeArtist" className="page-home__heading page-home__heading--small">Featured artist</h2>
      <div className="page-home__artist-body">
        <Link to={`/artists/${artist.slug}`} className="page-home__artist-portrait" tabIndex={-1} aria-hidden="true">
          <Avatar src={artist.portrait} name={artist.name} size={140} />
        </Link>
        <div className="page-home__artist-text">
          <h3 className="page-home__artist-name">
            <Link to={`/artists/${artist.slug}`}>{artist.name}</Link>
          </h3>
          <p className="page-home__artist-origin">
            {artist.country}, born {artist.bornYear}
          </p>
          <p className="page-home__artist-bio">{bio}</p>
        </div>
        <ul className="page-home__artist-works" aria-label={`Paintings by ${artist.name}`}>
          {paintings.slice(0, 3).map((p) => (
            <li key={p.slug}>
              <Link to={`/paintings/${p.slug}`} aria-label={p.title}>
                <FramedImage src={p.image} alt={p.title} tones={p.tones} ratio="4 / 3" />
              </Link>
            </li>
          ))}
        </ul>
        <Link to={`/artists/${artist.slug}`} className="caps-link page-home__artist-all">
          See all works<span className="visually-hidden"> by {artist.name}</span>
        </Link>
      </div>
    </section>
  );
}

function HomeLoading() {
  return (
    <div className="container section">
      <SkeletonGrid count={8} label="Loading the gallery" className="grid grid--3 grid--4" />
    </div>
  );
}

export default function Home() {
  useDocumentTitle('Home');
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi(() => getHome(), []);

  return (
    <div className="page-home">
      <Hero hero={data?.hero} loading={loading && !data} />
      <HomeSearch suggestions={data?.searchSuggestions?.length ? data.searchSuggestions : SUGGESTIONS} />

      {loading && !data && <HomeLoading />}
      {error && !data && (
        <div className="container section">
          <ErrorState error={error} onRetry={reload} title="We could not load the gallery." />
        </div>
      )}

      {data && (
        <>
          <Categories categories={data.categories} />

          <section className="section page-home__featured container" aria-labelledby="homeFeatured">
            <div className="section-head">
              <h2 id="homeFeatured" className="page-home__heading">Featured paintings</h2>
              <Link to="/gallery" className="caps-link">
                View all<span className="visually-hidden"> paintings</span>
              </Link>
            </div>
            <div className="grid grid--3 grid--4">
              {data.featured.map((p) => (
                <PaintingCard key={p.slug} painting={p} size="sm" />
              ))}
            </div>
          </section>

          {data.trending?.length > 0 && <Trending items={data.trending} />}
          <Helps />
          {data.featuredArtist?.artist && <FeaturedArtist data={data.featuredArtist} />}

          {data.collections?.length > 0 && (
            <section className="page-home__collections container" aria-labelledby="homeCollections">
              <h2 id="homeCollections" className="page-home__heading page-home__heading--small">Collections</h2>
              <ul className="page-home__collection-grid">
                {data.collections.map((c) => (
                  <li key={c.slug}>
                    <CollectionCard collection={c} variant="row" />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {!user && (
        <section
          className="page-home__cta"
          aria-labelledby="homeCta"
          style={{ backgroundImage: 'linear-gradient(var(--colour-overlay), var(--colour-overlay)), url(/images/home/cta_gallery.jpg)' }}
        >
          <div className="container page-home__cta-inner">
            <h2 id="homeCta" className="page-home__cta-title">Create a free account and get recommendations built on your taste.</h2>
            <Button to="/register" variant="light">Create an account</Button>
          </div>
        </section>
      )}
    </div>
  );
}
