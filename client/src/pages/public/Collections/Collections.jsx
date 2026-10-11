import { listCollections } from '../../../api/collections.js';
import CollectionCard from '../../../components/ui/CollectionCard/CollectionCard.jsx';
import EmptyState, { ErrorState } from '../../../components/ui/EmptyState/EmptyState.jsx';
import { SkeletonGrid } from '../../../components/ui/Skeleton/Skeleton.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './Collections.css';

export default function Collections() {
  useDocumentTitle('Collections');
  const { data, error, loading, reload } = useApi(() => listCollections(), []);
  const items = data?.items || [];

  return (
    <div className="page-collections container page-head">
      <span className="label eyebrow">Collections</span>
      <h1>Collections</h1>
      <p className="page-collections__lead">Ready made ways into the gallery, each one chosen around a mood, a colour or a subject.</p>

      <div className="page-collections__body">
        {loading && !data && <SkeletonGrid count={6} ratio="1 / 1" className="page-collections__grid" label="Loading collections" />}
        {error && <ErrorState error={error} onRetry={reload} title="We could not load the collections." />}
        {data && !error && items.length === 0 && <EmptyState title="There are no collections yet." text="Please come back soon." />}
        {items.length > 0 && (
          <ul className="page-collections__grid">
            {items.map((c) => (
              <li key={c.slug}>
                <CollectionCard collection={c} variant="mosaic" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
