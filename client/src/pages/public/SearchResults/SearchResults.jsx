import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { search } from '../../../api/search.js';
import Button from '../../../components/ui/Button/Button.jsx';
import Chip from '../../../components/ui/Chip/Chip.jsx';
import EmptyState, { ErrorState } from '../../../components/ui/EmptyState/EmptyState.jsx';
import Icon from '../../../components/ui/Icon/Icon.jsx';
import Pagination from '../../../components/ui/Pagination/Pagination.jsx';
import PaintingCard from '../../../components/ui/PaintingCard/PaintingCard.jsx';
import Select from '../../../components/ui/Select/Select.jsx';
import { SkeletonGrid } from '../../../components/ui/Skeleton/Skeleton.jsx';
import { useChat } from '../../../context/ChatContext.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { plural } from '../../../utils/format.js';
import './SearchResults.css';

const EXAMPLES = ['calm landscapes', 'abstract with warm colours', 'religious paintings on wood panel'];
const SORTS = [
  { value: 'best', label: 'Best match' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

function StartSearch() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const submit = (event) => {
    event.preventDefault();
    const q = text.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };
  return (
    <div className="page-search__start">
      <h1>Search the gallery</h1>
      <p className="lead page-search__start-lead">Describe what you would like to see, the way you would say it to a friend.</p>
      <form role="search" className="page-search__form" onSubmit={submit}>
        <label htmlFor="pageSearch" className="visually-hidden">Describe the painting you would like to see</label>
        <input
          id="pageSearch"
          type="search"
          className="input page-search__input"
          placeholder="Try: calm landscapes with soft light"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          autoFocus
          enterKeyHint="search"
        />
        <button type="submit" className="page-search__submit" aria-label="Search">
          <Icon name="search" size={18} />
        </button>
      </form>
      <ul className="cluster page-search__examples" aria-label="Try one of these">
        {EXAMPLES.map((q) => (
          <li key={q}>
            <Chip size="sm" to={`/search?q=${encodeURIComponent(q)}`}>{q}</Chip>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SearchResults() {
  useDocumentTitle('Search results');
  const [params, setParams] = useSearchParams();
  const { open } = useChat();
  const top = useRef(null);
  const q = (params.get('q') || '').trim();
  const exclude = (params.get('exclude') || '').split(',').filter(Boolean);
  const sort = SORTS.some((s) => s.value === params.get('sort')) ? params.get('sort') : 'best';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const { data, error, loading, reload } = useApi(() => search({ q, exclude, sort, page, limit: 12 }), [params.toString()], {
    enabled: Boolean(q),
  });

  const update = (changes, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete('page');
    setParams(next);
  };

  if (!q) {
    return (
      <div className="page-search container page-head">
        <StartSearch />
      </div>
    );
  }

  const removeChip = (chip) => update({ exclude: [...exclude, chip.key].join(',') });
  const understood = data?.understood || [];

  return (
    <div className="page-search container page-head">
      <div className="page-search__top" ref={top}>
        <div className="page-search__head">
          <p className="page-search__for">Showing results for</p>
          <h1 className="page-search__query">&ldquo;{q}&rdquo;</h1>
        </div>

        {understood.length > 0 && (
          <div className="page-search__chips-block">
            <div className="page-search__understood">
              <span className="page-search__understood-label">We understood</span>
              <ul className="page-search__chips" aria-label="What we understood">
                {understood.map((chip) => (
                  <li key={chip.key}>
                    <Chip variant="solid" onRemove={() => removeChip(chip)} removeLabel={`Remove ${chip.label}`}>{chip.label}</Chip>
                  </li>
                ))}
              </ul>
            </div>
            <p className="page-search__hint">Remove a chip to widen the search.</p>
          </div>
        )}

        <Select prefix="Sort:" size="sm" value={sort} options={SORTS} onChange={(v) => update({ sort: v === 'best' ? '' : v })} className="page-search__sort" />
      </div>

      <div className="page-search__results" aria-live="polite">
        {loading && !data && <SkeletonGrid count={8} className="grid grid--3 grid--4" label="Searching the gallery" />}
        {error && <ErrorState error={error} onRetry={reload} title="The search did not work." />}

        {data && !error && data.items.length === 0 && (
          <EmptyState title="No paintings match that search." text="A few things to try:">
            <ul className="page-search__tips">
              <li>Use fewer words, for example &ldquo;calm water&rdquo;.</li>
              <li>Remove one of the chips above to widen the search.</li>
              <li>Try a category, such as landscape, flower or abstract.</li>
            </ul>
          </EmptyState>
        )}

        {data && !error && data.items.length > 0 && (
          <>
            <p className="visually-hidden">{plural(data.total, 'painting')} found</p>
            <div className={`grid grid--3 grid--4 page-search__grid${loading ? ' page-search__grid--busy' : ''}`}>
              {data.items.map((p) => (
                <PaintingCard key={p.slug} painting={p} showCategory={false} ratio="1 / 1" />
              ))}
            </div>
            <Pagination
              page={data.page}
              pages={data.pages}
              onChange={(n) => {
                update({ page: n === 1 ? '' : String(n) }, false);
                top.current?.scrollIntoView({ block: 'start' });
              }}
            />
          </>
        )}
      </div>

      <div className="page-search__refine">
        <Button variant="secondary" size="lg" onClick={() => open({ query: q })} aria-haspopup="dialog">Refine with the assistant</Button>
      </div>
    </div>
  );
}
