import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { deletePainting, setFeatured } from '../../../api/admin.js';
import { AdminHeader, AdminSearch } from '../../../components/layout/AdminLayout/AdminLayout.jsx';
import Button from '../../../components/ui/Button/Button.jsx';
import DataTable from '../../../components/ui/DataTable/DataTable.jsx';
import FramedImage from '../../../components/ui/FramedImage/FramedImage.jsx';
import Icon from '../../../components/ui/Icon/Icon.jsx';
import Modal from '../../../components/ui/Modal/Modal.jsx';
import Pagination from '../../../components/ui/Pagination/Pagination.jsx';
import Select from '../../../components/ui/Select/Select.jsx';
import Skeleton from '../../../components/ui/Skeleton/Skeleton.jsx';
import Toggle from '../../../components/ui/Toggle/Toggle.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { CATEGORIES } from '../../../utils/constants.js';
import { formatNumber } from '../../../utils/format.js';
import { loadAllPaintings } from './allPaintings.js';
import './Paintings.css';

const PER_PAGE = 12;
const SORTS = ['title', 'views', 'saves'];
const CATEGORY_OPTIONS = [{ value: '', label: 'All categories' }, ...CATEGORIES];

export default function Paintings() {
  useDocumentTitle('Admin paintings');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = CATEGORIES.includes(params.get('category')) ? params.get('category') : '';
  const sort = SORTS.includes(params.get('sort')) ? params.get('sort') : '';
  const dir = params.get('dir') === 'asc' ? 'asc' : params.get('dir') === 'desc' ? 'desc' : sort === 'title' ? 'asc' : 'desc';
  const rows = useApi(() => loadAllPaintings({ q, category }), [q, category]);
  const [busy, setBusy] = useState(() => new Set());
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value === null || value === undefined || (key === 'page' && Number(value) === 1)) next.delete(key);
      else next.set(key, String(value));
    }
    setParams(next, { replace: !('page' in changes) });
  };

  const sorted = useMemo(() => {
    const list = [...(rows.data || [])];
    if (!sort) return list;
    const factor = dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title) : a[sort] - b[sort]) * factor);
  }, [rows.data, sort, dir]);

  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const page = Math.min(Math.max(Number(params.get('page')) || 1, 1), pages);
  const visible = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const onSort = (key) => {
    const nextDir = key === sort ? (dir === 'asc' ? 'desc' : 'asc') : key === 'title' ? 'asc' : 'desc';
    update({ sort: key, dir: nextDir, page: 1 });
  };

  const setRow = (id, changes) => rows.setData((list) => list.map((p) => (p.id === id ? { ...p, ...changes } : p)));

  const toggleFeatured = async (painting, featured) => {
    setRow(painting.id, { featured });
    setBusy((set) => new Set(set).add(painting.id));
    try {
      await setFeatured(painting.id, featured);
      toast.success(featured ? `${painting.title} is now featured.` : `${painting.title} is no longer featured.`);
    } catch (error) {
      setRow(painting.id, { featured: !featured });
      toast.error(error.message || 'We could not update that painting. Please try again.');
    } finally {
      setBusy((set) => {
        const next = new Set(set);
        next.delete(painting.id);
        return next;
      });
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deletePainting(toDelete.id);
      rows.setData((list) => list.filter((p) => p.id !== toDelete.id));
      toast.success(`${toDelete.title} was deleted.`);
      setToDelete(null);
    } catch (error) {
      toast.error(error.message || 'We could not delete that painting. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const featuredToggle = (p) => (
    <Toggle checked={p.featured} onChange={(value) => toggleFeatured(p, value)} busy={busy.has(p.id)} label={`Featured: ${p.title}`} />
  );

  const actions = (p) => (
    <span className="admin-actions">
      <Link to={`/admin/paintings/${p.id}/edit`} className="admin-icon-button" aria-label={`Edit ${p.title}`}>
        <Icon name="pencil" size={18} />
      </Link>
      <button type="button" className="admin-icon-button" onClick={() => setToDelete(p)} aria-label={`Delete ${p.title}`}>
        <Icon name="trash" size={18} />
      </button>
    </span>
  );

  const columns = [
    { key: 'thumbnail', header: 'Thumbnail', width: 96, render: (p) => <FramedImage src={p.image} alt="" tones={p.tones} ratio="1 / 1" className="page-admin-paintings__thumb" /> },
    { key: 'title', header: 'Title', sortable: true, render: (p) => <span className="page-admin-paintings__title">{p.title}</span> },
    { key: 'artist', header: 'Artist', render: (p) => p.artist?.name },
    { key: 'category', header: 'Category' },
    { key: 'style', header: 'Style' },
    { key: 'views', header: 'Views', sortable: true, render: (p) => formatNumber(p.views) },
    { key: 'saves', header: 'Saves', sortable: true, render: (p) => formatNumber(p.saves) },
    { key: 'featured', header: 'Featured', render: featuredToggle },
    { key: 'actions', header: 'Actions', render: actions },
  ];

  const empty = q || category ? 'No paintings match your search.' : 'No paintings yet.';

  return (
    <div className="page-admin-paintings">
      <AdminHeader title="Paintings">
        <AdminSearch value={q} onChange={(value) => update({ q: value, page: 1 })} placeholder="Search paintings" label="Search by title or artist" />
        <Select
          label="Category"
          hideLabel
          size="sm"
          value={category}
          onChange={(value) => update({ category: value, page: 1 })}
          options={CATEGORY_OPTIONS}
          className="page-admin-paintings__filter"
        />
        <Button to="/admin/paintings/new" size="sm" className="page-admin-paintings__add">Add painting</Button>
      </AdminHeader>

      {rows.error ? (
        <div className="admin-state admin-page-card" role="alert">
          <p>We could not load the paintings.</p>
          <Button variant="secondary" size="sm" onClick={rows.reload}>Try again</Button>
        </div>
      ) : (
        <>
          <p className="visually-hidden" role="status">{rows.loading ? 'Loading paintings' : `${sorted.length} paintings`}</p>
          <div className="page-admin-paintings__table">
            <DataTable
              columns={columns}
              rows={visible}
              loading={rows.loading}
              empty={empty}
              caption="Paintings"
              sortKey={sort}
              sortDir={dir}
              onSort={onSort}
            />
          </div>

          <ul className="page-admin-paintings__cards" aria-label="Paintings">
            {rows.loading &&
              Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="page-admin-paintings__card">
                  <Skeleton width={72} height={72} />
                  <Skeleton variant="text" lines={2} />
                </li>
              ))}
            {!rows.loading && visible.length === 0 && <li className="admin-state admin-page-card">{empty}</li>}
            {!rows.loading &&
              visible.map((p) => (
                <li key={p.id} className="page-admin-paintings__card">
                  <FramedImage src={p.image} alt="" tones={p.tones} ratio="1 / 1" className="page-admin-paintings__card-thumb" />
                  <div className="page-admin-paintings__card-body">
                    <h2 className="page-admin-paintings__card-title">{p.title}</h2>
                    <p className="page-admin-paintings__card-meta">{p.artist?.name}</p>
                    <p className="page-admin-paintings__card-meta">{p.category}</p>
                    <div className="page-admin-paintings__card-tools">
                      <span className="page-admin-paintings__card-toggle">
                        {featuredToggle(p)}
                        <span aria-hidden="true">Featured</span>
                      </span>
                      {actions(p)}
                    </div>
                  </div>
                </li>
              ))}
          </ul>

          <Pagination page={page} pages={pages} onChange={(n) => update({ page: n })} />
        </>
      )}

      <Modal
        open={Boolean(toDelete)}
        onClose={() => !deleting && setToDelete(null)}
        title={toDelete ? `Delete ${toDelete.title}?` : ''}
        size="sm"
        footer={
          <>
            <Button variant="danger" block loading={deleting} onClick={confirmDelete}>Delete painting</Button>
            <Button variant="secondary" block onClick={() => setToDelete(null)} disabled={deleting}>Cancel</Button>
          </>
        }
      >
        <p>This cannot be undone.</p>
      </Modal>
    </div>
  );
}
