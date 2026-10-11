import { useId, useMemo, useState } from 'react';
import { createCollection, deleteCollection, listCollections, updateCollection } from '../../../api/admin.js';
import { AdminHeader } from '../../../components/layout/AdminLayout/AdminLayout.jsx';
import Button from '../../../components/ui/Button/Button.jsx';
import FramedImage from '../../../components/ui/FramedImage/FramedImage.jsx';
import Icon from '../../../components/ui/Icon/Icon.jsx';
import Modal from '../../../components/ui/Modal/Modal.jsx';
import Skeleton from '../../../components/ui/Skeleton/Skeleton.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { FormError, TextField, useForm } from '../../auth/form.jsx';
import { loadAllPaintings } from '../Paintings/allPaintings.js';
import './Collections.css';

const MIN = 4;
const MAX = 8;

function validate(v) {
  return {
    title: v.title.trim() ? '' : 'Enter a title.',
    paintings: v.paintings.length < MIN || v.paintings.length > MAX ? `Choose between ${MIN} and ${MAX} paintings.` : '',
  };
}

function Mosaic({ covers = [] }) {
  return (
    <span className="page-admin-collections__mosaic" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => {
        const p = covers[i];
        return p ? <FramedImage key={p.slug} src={p.image} alt="" tones={p.tones} ratio="1 / 1" /> : <span key={i} className="page-admin-collections__blank" />;
      })}
    </span>
  );
}

function CollectionForm({ collection, paintings, onSaved, onCancel }) {
  const toast = useToast();
  const pickerId = useId();
  const [search, setSearch] = useState('');
  const form = useForm(
    { title: collection?.title || '', shortLine: collection?.shortLine || '', description: collection?.description || '', paintings: collection?.paintings || [] },
    validate,
  );
  const chosen = form.values.paintings;
  const bySlug = useMemo(() => new Map((paintings.data || []).map((p) => [p.slug, p])), [paintings.data]);

  const matches = useMemo(() => {
    const text = search.trim().toLowerCase();
    const all = paintings.data || [];
    const found = text ? all.filter((p) => p.title.toLowerCase().includes(text) || p.artist?.name.toLowerCase().includes(text)) : all;
    return found.slice(0, 30);
  }, [paintings.data, search]);

  const setChosen = (next) => form.setValue('paintings', next);
  const add = (slug) => chosen.length < MAX && !chosen.includes(slug) && setChosen([...chosen, slug]);
  const remove = (slug) => setChosen(chosen.filter((s) => s !== slug));
  const move = (index, step) => {
    const next = [...chosen];
    const [item] = next.splice(index, 1);
    const target = index + step;
    next.splice(target, 0, item);
    setChosen(next);
    requestAnimationFrame(() => {
      const row = form.formRef.current?.querySelector(`[data-slug="${item}"]`);
      const wanted = row?.querySelector(step < 0 ? '[data-move="up"]' : '[data-move="down"]');
      (wanted && !wanted.disabled ? wanted : row?.querySelector('[data-move]:not(:disabled)'))?.focus();
    });
  };

  const onSubmit = form.submit(async (v) => {
    const fields = { title: v.title.trim(), shortLine: v.shortLine.trim(), description: v.description.trim(), paintings: v.paintings };
    if (collection) await updateCollection(collection.id, fields);
    else await createCollection(fields);
    toast.success(`${fields.title} was saved.`);
    onSaved();
  });

  return (
    <form ref={form.formRef} className="page-admin-collections__form" onSubmit={onSubmit} noValidate>
      <FormError message={form.formError} />
      <TextField label="Title" labelStyle="caps" maxLength={80} {...form.field('title')} />
      <TextField label="Short line" labelStyle="caps" maxLength={120} {...form.field('shortLine')} />
      <TextField as="textarea" label="Description" labelStyle="caps" maxLength={1500} {...form.field('description')} />

      <fieldset className="page-admin-collections__picker" aria-describedby={`${pickerId}-count${form.errors.paintings ? ` ${pickerId}-error` : ''}`}>
        <legend className="field__label field__label--caps">Paintings</legend>
        <p id={`${pickerId}-count`} className="field__hint" aria-live="polite">
          {chosen.length} chosen. Choose between {MIN} and {MAX}.
        </p>
        {form.errors.paintings && <p id={`${pickerId}-error`} className="field__error" role="alert">{form.errors.paintings}</p>}

        {chosen.length > 0 && (
          <ol className="page-admin-collections__chosen" aria-label="Chosen paintings in order">
            {chosen.map((slug, index) => {
              const p = bySlug.get(slug);
              const name = p?.title || slug;
              return (
                <li key={slug} className="page-admin-collections__chosen-row" data-slug={slug}>
                  <span className="page-admin-collections__order">{index + 1}</span>
                  {p && <FramedImage src={p.image} alt="" tones={p.tones} ratio="1 / 1" className="page-admin-collections__thumb" />}
                  <span className="page-admin-collections__chosen-name">{name}</span>
                  <span className="admin-actions">
                    <button type="button" className="admin-icon-button" data-move="up" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${name} up`}>
                      <Icon name="chevronUp" size={18} />
                    </button>
                    <button type="button" className="admin-icon-button" data-move="down" onClick={() => move(index, 1)} disabled={index === chosen.length - 1} aria-label={`Move ${name} down`}>
                      <Icon name="chevronDown" size={18} />
                    </button>
                    <button type="button" className="admin-icon-button" onClick={() => remove(slug)} aria-label={`Remove ${name}`}>
                      <Icon name="close" size={18} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="field">
          <label htmlFor={`${pickerId}-search`} className="field__label">Find paintings to add</label>
          <input id={`${pickerId}-search`} type="search" className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or artist" />
        </div>
        {paintings.loading && <Skeleton variant="text" lines={3} />}
        {paintings.error && (
          <p className="field__error">
            We could not load the paintings. <button type="button" className="text-link" onClick={paintings.reload}>Try again</button>
          </p>
        )}
        {paintings.data && (
          <ul className="page-admin-collections__results" aria-label="Paintings you can add">
            {matches.length === 0 && <li className="page-admin-collections__none">No paintings match.</li>}
            {matches.map((p) => {
              const picked = chosen.includes(p.slug);
              return (
                <li key={p.slug} className="page-admin-collections__result">
                  <FramedImage src={p.image} alt="" tones={p.tones} ratio="1 / 1" className="page-admin-collections__thumb" />
                  <span className="page-admin-collections__result-text">
                    <span className="page-admin-collections__chosen-name">{p.title}</span>
                    <span className="page-admin-collections__artist">{p.artist?.name}</span>
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => add(p.slug)} disabled={picked || chosen.length >= MAX} aria-label={picked ? `${p.title} is added` : `Add ${p.title}`}>
                    {picked ? 'Added' : 'Add'}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>

      <div className="page-admin-collections__buttons">
        <Button type="submit" block loading={form.sending}>Save</Button>
        <Button variant="secondary" block onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default function Collections() {
  useDocumentTitle('Admin collections');
  const toast = useToast();
  const list = useApi(() => listCollections(), []);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const paintings = useApi(() => loadAllPaintings(), [], { enabled: Boolean(editing) });

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteCollection(toDelete.id);
      list.setData((data) => ({ ...data, items: data.items.filter((c) => c.id !== toDelete.id) }));
      toast.success(`${toDelete.title} was deleted.`);
      setToDelete(null);
    } catch (error) {
      toast.error(error.message || 'We could not delete that collection. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const items = list.data?.items || [];

  return (
    <div className="page-admin-collections">
      <AdminHeader title="Collections">
        <Button size="sm" onClick={() => setEditing('new')} className="page-admin-collections__new">New collection</Button>
      </AdminHeader>

      {list.error ? (
        <div className="admin-state admin-page-card" role="alert">
          <p>We could not load the collections.</p>
          <Button variant="secondary" size="sm" onClick={list.reload}>Try again</Button>
        </div>
      ) : (
        <ul className="page-admin-collections__list" aria-label="Collections" aria-busy={list.loading || undefined}>
          {list.loading &&
            Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="page-admin-collections__row">
                <Skeleton width={88} height={88} />
                <Skeleton variant="text" lines={2} />
              </li>
            ))}
          {!list.loading && !items.length && <li className="admin-state admin-page-card">No collections yet.</li>}
          {!list.loading &&
            items.map((c) => (
              <li key={c.id} className="page-admin-collections__row">
                <Mosaic covers={c.covers} />
                <div className="page-admin-collections__body">
                  <h2 className="page-admin-collections__title">{c.title}</h2>
                  {c.shortLine && <p className="page-admin-collections__line">{c.shortLine}</p>}
                  <p className="page-admin-collections__count">{c.count} {c.count === 1 ? 'painting' : 'paintings'}</p>
                </div>
                <span className="admin-actions">
                  <button type="button" className="admin-icon-button" onClick={() => setEditing(c)} aria-label={`Edit ${c.title}`}>
                    <Icon name="pencil" size={18} />
                  </button>
                  <button type="button" className="admin-icon-button" onClick={() => setToDelete(c)} aria-label={`Delete ${c.title}`}>
                    <Icon name="trash" size={18} />
                  </button>
                </span>
              </li>
            ))}
        </ul>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'New collection' : 'Edit collection'} size="lg">
        {editing && (
          <CollectionForm
            collection={editing === 'new' ? null : editing}
            paintings={paintings}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              list.reload();
            }}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => !deleting && setToDelete(null)}
        title={toDelete ? `Delete ${toDelete.title}?` : ''}
        size="sm"
        footer={
          <>
            <Button variant="danger" block loading={deleting} onClick={confirmDelete}>Delete collection</Button>
            <Button variant="secondary" block onClick={() => setToDelete(null)} disabled={deleting}>Cancel</Button>
          </>
        }
      >
        <p>The paintings stay in the gallery. This cannot be undone.</p>
      </Modal>
    </div>
  );
}
