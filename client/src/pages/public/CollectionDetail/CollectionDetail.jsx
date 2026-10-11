import { useParams } from 'react-router-dom';
import { getCollection } from '../../../api/collections.js';
import Breadcrumb from '../../../components/ui/Breadcrumb/Breadcrumb.jsx';
import { ErrorState } from '../../../components/ui/EmptyState/EmptyState.jsx';
import PaintingCard from '../../../components/ui/PaintingCard/PaintingCard.jsx';
import Skeleton, { Loading, SkeletonGrid } from '../../../components/ui/Skeleton/Skeleton.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { useIsPhone } from '../../../hooks/useMediaQuery.js';
import { plural } from '../../../utils/format.js';
import NotFound from '../NotFound/NotFound.jsx';
import './CollectionDetail.css';

export default function CollectionDetail() {
  const { slug } = useParams();
  const isPhone = useIsPhone();
  const { data, error, loading, reload } = useApi(() => getCollection(slug), [slug]);
  const collection = data?.collection;
  useDocumentTitle(collection?.title || (error?.status === 404 ? 'Page not found' : 'Collection'));

  if (error?.status === 404) return <NotFound />;

  if (error) {
    return (
      <div className="container section">
        <ErrorState error={error} onRetry={reload} title="We could not load this collection." />
      </div>
    );
  }

  const paintings = data?.paintings || [];

  return (
    <div className="page-collection">
      <div className="container page-head">
        <Breadcrumb items={[{ label: 'Collections', to: '/collections' }, { label: collection?.title || 'Collection' }]} />
        {loading && !collection ? (
          <Loading label="Loading the collection" className="page-collection__intro">
            <Skeleton height={48} width="60%" />
            <Skeleton variant="text" lines={2} className="mt-4" />
          </Loading>
        ) : (
          <div className="page-collection__intro">
            <span className="label eyebrow">Collection</span>
            <h1>{collection.title}</h1>
            <p className="page-collection__description">{collection.description}</p>
            <p className="page-collection__count">{plural(paintings.length, 'painting')}</p>
          </div>
        )}
      </div>

      <section className="page-collection__band" aria-label="Paintings in this collection">
        <div className="container">
          {loading && !data ? (
            <SkeletonGrid count={8} ratio="3 / 4" className="grid grid--3 grid--4" />
          ) : (
            <div className="grid grid--3 grid--4 page-collection__grid">
              {paintings.map((p) => (
                <PaintingCard
                  key={p.slug}
                  painting={p}
                  ratio={isPhone ? '1 / 1' : '3 / 4'}
                  showCategory={false}
                  showArtist={false}
                  showYear={false}
                  showHeart={false}
                  size="lg"
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
