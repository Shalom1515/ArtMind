import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { USE_MOCK } from '../../../api/client.js';
import { exportFavourites, listFavourites } from '../../../api/favourites.js';
import Button from '../../../components/ui/Button/Button.jsx';
import EmptyState, { ErrorState } from '../../../components/ui/EmptyState/EmptyState.jsx';
import PaintingCard from '../../../components/ui/PaintingCard/PaintingCard.jsx';
import Select from '../../../components/ui/Select/Select.jsx';
import { SkeletonGrid } from '../../../components/ui/Skeleton/Skeleton.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useFavourites } from '../../../context/FavouritesContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { plural } from '../../../utils/format.js';
import './Favourites.css';

const SORTS = [
  { value: 'recent', label: 'Recently saved' },
  { value: 'title', label: 'Title' },
  { value: 'artist', label: 'Artist' },
];

export default function Favourites() {
  useDocumentTitle('Favourites');
  const { user } = useAuth();
  const toast = useToast();
  const { isSaved, ready, remove } = useFavourites();
  const [params, setParams] = useSearchParams();
  const [exporting, setExporting] = useState(false);
  const sort = SORTS.some((s) => s.value === params.get('sort')) ? params.get('sort') : 'recent';
  const { data, error, loading, reload } = useApi(() => listFavourites(sort), [sort, user?.id]);

  const items = (data?.items || []).filter(({ painting }) => !ready || isSaved(painting.slug));

  const exportPdf = async () => {
    if (USE_MOCK) {
      toast.info('Downloads work when the server is running');
      return;
    }
    setExporting(true);
    try {
      await exportFavourites();
    } catch (err) {
      toast.error(err.message || 'The export did not work. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-favourites container page-head">
      <div className="page-favourites__head">
        <div>
          <h1>Favourites</h1>
          <p className="page-head__count" aria-live="polite">{data ? plural(items.length, 'painting') : ' '}</p>
        </div>
        <div className="page-favourites__tools">
          <Select
            prefix="Sort:"
            size="sm"
            value={sort}
            options={SORTS}
            onChange={(v) => {
              const next = new URLSearchParams(params);
              if (v === 'recent') next.delete('sort');
              else next.set('sort', v);
              setParams(next);
            }}
            className="page-favourites__sort"
          />
          <Button variant="secondary" onClick={exportPdf} loading={exporting} disabled={!items.length}>Export as PDF</Button>
        </div>
      </div>

      {loading && !data && <SkeletonGrid count={6} className="grid grid--3" label="Loading your favourites" />}
      {error && <ErrorState error={error} onRetry={reload} title="We could not load your favourites." />}

      {data && !error && items.length === 0 && (
        <EmptyState
          title="You have not saved any paintings yet."
          text="Tap the heart on any painting to keep it here."
          action={<Button to="/gallery">Open the gallery</Button>}
        />
      )}

      {items.length > 0 && (
        <ul className="grid grid--3 page-favourites__grid">
          {items.map(({ painting }) => (
            <li key={painting.slug} className="page-favourites__item">
              <PaintingCard painting={painting} showCategory={false} showYear={false} size="lg">
                <button type="button" className="page-favourites__remove" onClick={() => remove(painting)}>
                  Remove<span className="visually-hidden"> {painting.title}</span>
                </button>
              </PaintingCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
