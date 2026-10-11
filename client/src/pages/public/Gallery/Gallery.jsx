import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listArtists } from '../../../api/artists.js';
import { getOptions, listPaintings } from '../../../api/paintings.js';
import Button from '../../../components/ui/Button/Button.jsx';
import Checkbox from '../../../components/ui/Checkbox/Checkbox.jsx';
import Chip from '../../../components/ui/Chip/Chip.jsx';
import EmptyState, { ErrorState } from '../../../components/ui/EmptyState/EmptyState.jsx';
import Icon from '../../../components/ui/Icon/Icon.jsx';
import Modal from '../../../components/ui/Modal/Modal.jsx';
import Pagination from '../../../components/ui/Pagination/Pagination.jsx';
import PaintingCard from '../../../components/ui/PaintingCard/PaintingCard.jsx';
import Select from '../../../components/ui/Select/Select.jsx';
import { SkeletonGrid } from '../../../components/ui/Skeleton/Skeleton.jsx';
import Swatch from '../../../components/ui/Swatch/Swatch.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDebounce } from '../../../hooks/useDebounce.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { useIsPhone } from '../../../hooks/useMediaQuery.js';
import { CATEGORIES, COLOUR_GROUPS } from '../../../utils/constants.js';
import { plural } from '../../../utils/format.js';
import './Gallery.css';

const LIST_KEYS = ['category', 'style', 'medium', 'surface', 'colour'];
const ALL_KEYS = [...LIST_KEYS, 'yearFrom', 'yearTo', 'artist'];
const GROUP_LABELS = { category: 'Category', style: 'Style', medium: 'Medium', surface: 'Surface', colour: 'Colour' };
const COLOUR_NAMES = {
  red: 'Red', orange: 'Orange', yellow: 'Ochre', green: 'Olive', teal: 'Teal', blue: 'Navy',
  violet: 'Purple', pink: 'Pink', cream: 'Cream', grey: 'Grey', brown: 'Brown', black: 'Black',
};
const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'title', label: 'Title A to Z' },
];
const MEDIUMS = ['Oil', 'Acrylic', 'Watercolour', 'Gouache', 'Ink', 'Pastel', 'Charcoal', 'Tempera', 'Mixed media'];
const SURFACES = ['Canvas', 'Linen', 'Paper', 'Wood panel', 'Board'];

const split = (value) => (value ? value.split(',').filter(Boolean) : []);

function readFilters(params) {
  const filters = {};
  for (const key of LIST_KEYS) filters[key] = split(params.get(key));
  filters.yearFrom = params.get('yearFrom') || '';
  filters.yearTo = params.get('yearTo') || '';
  filters.artist = params.get('artist') || '';
  return filters;
}

function countActive(filters) {
  return LIST_KEYS.reduce((n, key) => n + filters[key].length, 0) + ['yearFrom', 'yearTo', 'artist'].filter((k) => filters[k]).length;
}

function toQuery(filters) {
  const query = {};
  for (const key of LIST_KEYS) if (filters[key].length) query[key] = filters[key].join(',');
  for (const key of ['yearFrom', 'yearTo', 'artist']) if (filters[key]) query[key] = filters[key];
  return query;
}

const EMPTY = readFilters(new URLSearchParams());

function YearInput({ label, value, onCommit, idPrefix }) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text, 600);
  const last = useRef(value);

  useEffect(() => {
    last.current = value;
    setText(value);
  }, [value]);

  useEffect(() => {
    const clean = /^\d{4}$/.test(debounced) || debounced === '' ? debounced : null;
    if (clean !== null && clean !== last.current) {
      last.current = clean;
      onCommit(clean);
    }
  }, [debounced, onCommit]);

  return (
    <>
      <label htmlFor={`${idPrefix}${label}`} className="visually-hidden">Year {label.toLowerCase()}</label>
      <input
        id={`${idPrefix}${label}`}
        className="input page-gallery__year"
        inputMode="numeric"
        maxLength={4}
        placeholder={label}
        value={text}
        onChange={(e) => setText(e.target.value.replace(/\D/g, ''))}
      />
    </>
  );
}

function FilterGroup({ title, children }) {
  return (
    <fieldset className="page-gallery__group">
      <legend className="label page-gallery__legend">{title}</legend>
      {children}
    </fieldset>
  );
}

function Filters({ filters, counts = {}, options, artists, onChange, onClear, idPrefix }) {
  const toggle = (key, value, on) => {
    const list = on ? [...filters[key], value] : filters[key].filter((v) => v !== value);
    onChange({ ...filters, [key]: list });
  };
  const checkList = (key, values) => (
    <ul className="page-gallery__checks">
      {values.map((value) => (
        <li key={value}>
          <Checkbox
            label={value}
            checked={filters[key].includes(value)}
            count={counts[key]?.[value] ?? 0}
            onChange={(on) => toggle(key, value, on)}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="page-gallery__filters">
      <FilterGroup title="Category">{checkList('category', CATEGORIES)}</FilterGroup>
      <FilterGroup title="Style">{checkList('style', options?.styles || [])}</FilterGroup>
      <FilterGroup title="Medium">{checkList('medium', MEDIUMS)}</FilterGroup>
      <FilterGroup title="Surface">{checkList('surface', SURFACES)}</FilterGroup>
      <FilterGroup title="Dominant colour">
        <ul className="page-gallery__swatches">
          {COLOUR_GROUPS.map((c) => (
            <li key={c.key}>
              <Swatch
                colour={c.hex}
                label={`${COLOUR_NAMES[c.key]}, ${counts.colour?.[c.key] ?? 0} paintings`}
                selected={filters.colour.includes(c.key)}
                onClick={() => toggle('colour', c.key, !filters.colour.includes(c.key))}
                size="fill"
              />
            </li>
          ))}
        </ul>
      </FilterGroup>
      <FilterGroup title="Year">
        <div className="page-gallery__years">
          <YearInput label="From" idPrefix={idPrefix} value={filters.yearFrom} onCommit={(v) => onChange({ ...filters, yearFrom: v })} />
          <YearInput label="To" idPrefix={idPrefix} value={filters.yearTo} onCommit={(v) => onChange({ ...filters, yearTo: v })} />
        </div>
      </FilterGroup>
      <div className="page-gallery__group">
        <Select
          label="Artist"
          labelStyle="caps"
          size="sm"
          value={filters.artist}
          onChange={(v) => onChange({ ...filters, artist: v })}
          options={[{ value: '', label: 'Any artist' }, ...artists.map((a) => ({ value: a.slug, label: a.name }))]}
        />
      </div>
      {onClear && (
        <button type="button" className="caps-link page-gallery__clear" onClick={onClear}>Clear all</button>
      )}
    </div>
  );
}

function FilterDrawer({ open, onClose, filters, options, artists, onApply }) {
  const [draft, setDraft] = useState(filters);
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);
  const draftKey = JSON.stringify(toQuery(draft));
  const { data } = useApi(() => listPaintings({ ...toQuery(draft), limit: 1 }), [draftKey], { enabled: open });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filters"
      className="page-gallery__drawer"
      footer={
        <div className="page-gallery__drawer-buttons">
          <Button variant="secondary" onClick={() => setDraft(EMPTY)}>Clear</Button>
          <Button onClick={() => onApply(draft)}>Apply</Button>
        </div>
      }
    >
      <Filters filters={draft} counts={data?.counts} options={options} artists={artists} onChange={setDraft} idPrefix="drawer" />
    </Modal>
  );
}

export default function Gallery() {
  useDocumentTitle('Gallery');
  const [params, setParams] = useSearchParams();
  const isPhone = useIsPhone();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const top = useRef(null);

  const filters = useMemo(() => readFilters(params), [params]);
  const sort = SORTS.some((s) => s.value === params.get('sort')) ? params.get('sort') : 'newest';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const queryKey = params.toString();

  const options = useApi(() => getOptions(), []);
  const artistList = useApi(() => listArtists(), []);
  const artists = artistList.data?.items || [];
  const { data, error, loading, reload } = useApi(
    () => listPaintings({ ...toQuery(filters), sort, page, limit: 12 }),
    [queryKey],
  );

  useEffect(() => {
    if (!isPhone) setDrawerOpen(false);
  }, [isPhone]);

  const update = (changes, { resetPage = true, replace = false } = {}) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      const text = Array.isArray(value) ? value.join(',') : value;
      if (text === '' || text === undefined || text === null) next.delete(key);
      else next.set(key, String(text));
    }
    if (resetPage) next.delete('page');
    setParams(next, { replace });
  };

  const applyFilters = (nextFilters) => {
    const changes = {};
    for (const key of ALL_KEYS) changes[key] = nextFilters[key];
    const yearOnly = ALL_KEYS.every((k) => k === 'yearFrom' || k === 'yearTo' || String(nextFilters[k]) === String(filters[k]));
    update(changes, { replace: yearOnly });
  };

  const clearAll = () => {
    const next = new URLSearchParams();
    if (params.get('sort')) next.set('sort', params.get('sort'));
    setParams(next);
  };

  const goToPage = (n) => {
    update({ page: n === 1 ? '' : n }, { resetPage: false });
    top.current?.scrollIntoView({ block: 'start' });
  };

  const chips = [];
  for (const key of LIST_KEYS) {
    for (const value of filters[key]) {
      const shown = key === 'colour' ? COLOUR_NAMES[value] || value : value;
      chips.push({ id: `${key}${value}`, label: `${GROUP_LABELS[key]}: ${shown}`, remove: () => update({ [key]: filters[key].filter((v) => v !== value) }) });
    }
  }
  if (filters.yearFrom) chips.push({ id: 'from', label: `From: ${filters.yearFrom}`, remove: () => update({ yearFrom: '' }) });
  if (filters.yearTo) chips.push({ id: 'to', label: `To: ${filters.yearTo}`, remove: () => update({ yearTo: '' }) });
  if (filters.artist) {
    const name = artists.find((a) => a.slug === filters.artist)?.name || filters.artist;
    chips.push({ id: 'artist', label: `Artist: ${name}`, remove: () => update({ artist: '' }) });
  }

  const active = countActive(filters);
  const sortSelect = (
    <Select
      prefix="Sort:"
      size="sm"
      value={sort}
      onChange={(v) => update({ sort: v === 'newest' ? '' : v })}
      options={SORTS}
      className="page-gallery__sort"
    />
  );

  return (
    <div className="page-gallery container page-head">
      <div className="page-gallery__head" ref={top}>
        <div className="page-gallery__title-row">
          <h1>Gallery</h1>
          <p className="page-head__count" aria-live="polite">{data ? plural(data.total, 'painting') : ' '}</p>
        </div>
        {!isPhone && sortSelect}
      </div>

      {isPhone && (
        <div className="page-gallery__phone-tools">
          <button type="button" className="page-gallery__filter-button" onClick={() => setDrawerOpen(true)} aria-haspopup="dialog">
            <Icon name="sliders" size={18} />
            Filters ({active})
          </button>
          {sortSelect}
        </div>
      )}

      <div className="page-gallery__layout">
        {!isPhone && (
          <aside className="page-gallery__sidebar" aria-label="Filters">
            <Filters
              filters={filters}
              counts={data?.counts}
              options={options.data}
              artists={artists}
              onChange={applyFilters}
              onClear={clearAll}
              idPrefix="side"
            />
          </aside>
        )}

        <div className="page-gallery__results">
          {chips.length > 0 && (
            <ul className="page-gallery__chips" aria-label="Active filters">
              {chips.map((chip) => (
                <li key={chip.id}>
                  <Chip variant="soft" size="sm" onRemove={chip.remove} removeLabel={`Remove filter ${chip.label}`}>{chip.label}</Chip>
                </li>
              ))}
            </ul>
          )}

          {loading && !data && <SkeletonGrid count={12} className="grid grid--3" />}
          {error && <ErrorState error={error} onRetry={reload} title="We could not load the paintings." />}

          {data && !error && data.items.length === 0 && (
            <EmptyState
              title="No paintings match these filters."
              text="Try removing a filter or two to see more of the gallery."
              action={<Button variant="secondary" onClick={clearAll}>Clear all</Button>}
            />
          )}

          {data && !error && data.items.length > 0 && (
            <>
              <div className={`grid grid--3 page-gallery__grid${loading ? ' page-gallery__grid--busy' : ''}`} aria-busy={loading || undefined}>
                {data.items.map((p) => (
                  <PaintingCard key={p.slug} painting={p} />
                ))}
              </div>
              <Pagination page={data.page} pages={data.pages} onChange={goToPage} />
            </>
          )}
        </div>
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        options={options.data}
        artists={artists}
        onApply={(next) => {
          applyFilters(next);
          setDrawerOpen(false);
        }}
      />
    </div>
  );
}
