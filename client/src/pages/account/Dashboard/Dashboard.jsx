import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getInsights, getRecommendations, refreshTaste } from '../../../api/me.js';
import BarList from '../../../components/ui/BarList/BarList.jsx';
import Button from '../../../components/ui/Button/Button.jsx';
import Carousel from '../../../components/ui/Carousel/Carousel.jsx';
import CollectionCard from '../../../components/ui/CollectionCard/CollectionCard.jsx';
import EmptyState, { ErrorState } from '../../../components/ui/EmptyState/EmptyState.jsx';
import FramedImage from '../../../components/ui/FramedImage/FramedImage.jsx';
import PaintingCard from '../../../components/ui/PaintingCard/PaintingCard.jsx';
import Skeleton, { Loading, SkeletonGrid } from '../../../components/ui/Skeleton/Skeleton.jsx';
import StatTile from '../../../components/ui/StatTile/StatTile.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { useIsPhone, useMediaQuery } from '../../../hooks/useMediaQuery.js';
import { firstName, formatLongDate } from '../../../utils/format.js';
import './Dashboard.css';

function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function Quiet({ text }) {
  return (
    <p className="page-dashboard__quiet">
      {text} <Link to="/gallery" className="text-link">Open the gallery</Link>
    </p>
  );
}

function Recommended({ initial, isPhone }) {
  const [expanded, setExpanded] = useState(false);
  const more = useApi(() => getRecommendations(24), [], { enabled: expanded });
  const list = expanded && more.data ? more.data.items : initial.slice(0, isPhone ? 4 : 8);

  if (!initial.length) {
    return (
      <EmptyState
        title="Your recommendations start here."
        text="View and save a few paintings and we will suggest more like them."
        action={<Button to="/gallery">Explore the gallery</Button>}
      />
    );
  }

  return (
    <>
      <div className="grid grid--3 grid--4 page-dashboard__recs" id="recommendedList">
        {list.map(({ painting, reason }) => (
          <PaintingCard key={painting.slug} painting={painting} reason={reason} showCategory={false} showYear={false} size="sm" ratio="16 / 10" />
        ))}
      </div>
      {expanded && more.loading && <SkeletonGrid count={4} className="grid grid--3 grid--4 mt-5" label="Loading more recommendations" />}
      {expanded && more.error && <ErrorState error={more.error} onRetry={more.reload} title="We could not load more recommendations." />}
      <div className="page-dashboard__more">
        <button
          type="button"
          className="caps-link"
          aria-expanded={expanded}
          aria-controls="recommendedList"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show fewer' : 'View all'}
        </button>
      </div>
    </>
  );
}

function TasteCard({ initial }) {
  const toast = useToast();
  const [taste, setTaste] = useState(initial);
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setBusy(true);
    try {
      const result = await refreshTaste();
      setTaste(result.taste);
    } catch (err) {
      toast.error(err.message || 'We could not refresh your taste summary. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card page-dashboard__taste" aria-labelledby="tasteTitle">
      <h2 id="tasteTitle" className="label">Your taste</h2>
      <p className="page-dashboard__taste-text" aria-live="polite" aria-busy={busy || undefined}>{taste}</p>
      <button type="button" className="caps-link page-dashboard__refresh" onClick={refresh} disabled={busy}>
        {busy ? 'Refreshing...' : 'Refresh'}
      </button>
    </section>
  );
}

function DashboardLoading() {
  return (
    <Loading label="Loading your dashboard" className="container">
      <div className="page-dashboard__stats-skeleton">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} height={64} />
        ))}
      </div>
      <SkeletonGrid count={8} className="grid grid--3 grid--4" ratio="16 / 10" />
    </Loading>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  useDocumentTitle('Dashboard');
  const isPhone = useIsPhone();
  const isTablet = useMediaQuery('(max-width: 1023px)');
  const { data, error, loading, reload } = useApi(() => getInsights(), [user?.id]);

  const stats = data?.stats;
  const recent = data?.recentlyViewed || [];
  const categories = (data?.favouriteCategories || []).map((c) => ({ label: c.name, value: c.count }));
  const collections = data?.collectionsForYou || [];

  return (
    <div className="page-dashboard">
      <div className="container page-dashboard__hello">
        <h1>
          {greetingFor()}, {firstName(user?.name)}
        </h1>
        <p className="page-dashboard__date">{formatLongDate()}</p>
      </div>

      {loading && !data && <DashboardLoading />}
      {error && !data && (
        <div className="container section">
          <ErrorState error={error} onRetry={reload} title="We could not load your dashboard." />
        </div>
      )}

      {data && (
        <>
          <section className="page-dashboard__stats" aria-label="Your activity">
            <div className="container">
              <ul className="page-dashboard__stat-list">
                <li><StatTile value={stats.viewed} label="Paintings viewed" variant="band" /></li>
                <li><StatTile value={stats.favourites} label="Favourites" variant="band" /></li>
                <li><StatTile value={stats.categoriesExplored} label="Categories explored" variant="band" /></li>
                <li><StatTile value={stats.conversations} label="Conversations" variant="band" /></li>
              </ul>
            </div>
          </section>

          <section className="container page-dashboard__section" aria-labelledby="recTitle">
            <h2 id="recTitle" className="page-dashboard__heading">Recommended for you</h2>
            <Recommended initial={data.recommended || []} isPhone={isPhone} />
          </section>

          <section className="page-dashboard__recent" aria-labelledby="recentTitle">
            <div className="container">
              <h2 id="recentTitle" className="page-dashboard__heading">Recently viewed</h2>
              {recent.length ? (
                <Carousel itemWidth={isPhone ? '30%' : isTablet ? '22%' : 'calc((100% - 80px) / 6)'} label="Recently viewed">
                  {recent.map((p) => (
                    <Link key={p.slug} to={`/paintings/${p.slug}`} className="page-dashboard__recent-tile" aria-label={`${p.title} by ${p.artist?.name}`}>
                      <FramedImage src={p.image} alt={p.title} tones={p.tones} ratio="4 / 3" frame="mat" />
                    </Link>
                  ))}
                </Carousel>
              ) : (
                <Quiet text="Paintings you open will appear here." />
              )}
            </div>
          </section>

          <div className="container page-dashboard__split">
            <section aria-labelledby="catTitle">
              <h2 id="catTitle" className="page-dashboard__heading">Your favourite categories</h2>
              {categories.length ? (
                <BarList items={categories} label="Your favourite categories" className="page-dashboard__bars" />
              ) : (
                <Quiet text="Look around and your favourite categories will show here." />
              )}
            </section>
            <TasteCard initial={data.taste} />
          </div>

          <section className="container page-dashboard__section page-dashboard__collections" aria-labelledby="colTitle">
            <h2 id="colTitle" className="page-dashboard__heading">Collections for you</h2>
            {collections.length ? (
              <ul className="page-dashboard__collection-list">
                {collections.map((c) => (
                  <li key={c.title}>
                    <CollectionCard collection={c} reason={c.reason} variant={isPhone ? 'strip' : 'mosaic'} />
                  </li>
                ))}
              </ul>
            ) : (
              <Quiet text="Collections picked for you will appear once you have looked around." />
            )}
          </section>
        </>
      )}
    </div>
  );
}
