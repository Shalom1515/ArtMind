import { useMemo, useState } from 'react';
import { listArtists } from '../../../api/artists.js';
import ArtistCard from '../../../components/ui/ArtistCard/ArtistCard.jsx';
import Button from '../../../components/ui/Button/Button.jsx';
import EmptyState, { ErrorState } from '../../../components/ui/EmptyState/EmptyState.jsx';
import Icon from '../../../components/ui/Icon/Icon.jsx';
import Skeleton, { Loading } from '../../../components/ui/Skeleton/Skeleton.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { cx } from '../../../utils/cx.js';
import { plural } from '../../../utils/format.js';
import './Artists.css';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const surnameLetter = (name = '') => (name.trim().split(/\s+/).pop() || '').charAt(0).toUpperCase();

export default function Artists() {
  useDocumentTitle('Artists');
  const [query, setQuery] = useState('');
  const [letter, setLetter] = useState('all');
  const { data, error, loading, reload } = useApi(() => listArtists(), []);
  const all = data?.items || [];

  const used = useMemo(() => new Set(all.map((a) => surnameLetter(a.name))), [all]);
  const shown = all.filter((a) => {
    const matchesText = !query.trim() || a.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchesLetter = letter === 'all' || surnameLetter(a.name) === letter;
    return matchesText && matchesLetter;
  });

  const letterButton = (value, label) => {
    const disabled = value !== 'all' && !used.has(value);
    const active = letter === value;
    return (
      <li key={value}>
        <button
          type="button"
          className={cx('page-artists__letter', active && 'page-artists__letter--on')}
          onClick={() => setLetter(value)}
          disabled={disabled}
          aria-pressed={active}
          aria-label={value === 'all' ? 'All artists' : `Surnames starting with ${value}${disabled ? ', none' : ''}`}
        >
          {label}
        </button>
      </li>
    );
  };

  return (
    <div className="page-artists container page-head">
      <div className="page-artists__head">
        <div>
          <h1>Artists</h1>
          <p className="page-artists__count" aria-live="polite">{data ? plural(shown.length, 'artist') : ' '}</p>
        </div>
        <div className="page-artists__search">
          <Icon name="search" size={18} className="page-artists__search-icon" />
          <label htmlFor="artistSearch" className="visually-hidden">Find an artist</label>
          <input
            id="artistSearch"
            type="search"
            className="input page-artists__search-input"
            placeholder="Find an artist"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <nav className="page-artists__letters" aria-label="Filter by the first letter of the surname" data-scroll>
          <ul>
            {letterButton('all', 'All')}
            {LETTERS.map((l) => letterButton(l, l))}
          </ul>
        </nav>
      </div>

      {loading && !data && (
        <Loading label="Loading artists" className="page-artists__grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="page-artists__skeleton">
              <Skeleton variant="circle" width={96} />
              <Skeleton variant="text" lines={3} />
            </div>
          ))}
        </Loading>
      )}
      {error && <ErrorState error={error} onRetry={reload} title="We could not load the artists." />}

      {data && !error && shown.length === 0 && (
        <EmptyState
          image={null}
          title="No artists match that search."
          text="Check the spelling or try another letter."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('');
                setLetter('all');
              }}
            >
              Show all artists
            </Button>
          }
        />
      )}

      {shown.length > 0 && (
        <ul className="page-artists__grid">
          {shown.map((artist) => (
            <li key={artist.slug}>
              <ArtistCard artist={artist} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
