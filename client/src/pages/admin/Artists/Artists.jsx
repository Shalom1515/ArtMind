import { useEffect, useId, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createArtist, deleteArtist, listArtists, updateArtist } from '../../../api/admin.js';
import { AdminHeader, AdminSearch } from '../../../components/layout/AdminLayout/AdminLayout.jsx';
import Avatar from '../../../components/ui/Avatar/Avatar.jsx';
import Button from '../../../components/ui/Button/Button.jsx';
import DataTable from '../../../components/ui/DataTable/DataTable.jsx';
import Icon from '../../../components/ui/Icon/Icon.jsx';
import Modal from '../../../components/ui/Modal/Modal.jsx';
import Select from '../../../components/ui/Select/Select.jsx';
import Skeleton from '../../../components/ui/Skeleton/Skeleton.jsx';
import TagInput from '../../../components/ui/TagInput/TagInput.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { COUNTRIES } from '../../../utils/countries.js';
import { FormError, TextField, useForm } from '../../auth/form.jsx';
import './Artists.css';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO = 2 * 1024 * 1024;
const THIS_YEAR = new Date().getFullYear();
const STILL_HAS_WORK = "Move or delete this artist's paintings first.";

function validate(v) {
  const born = Number(v.bornYear);
  return {
    name: v.name.trim().length >= 2 ? '' : 'Enter a name.',
    country: v.country ? '' : 'Choose a country.',
    bornYear: String(v.bornYear).trim() && Number.isInteger(born) && born >= 1900 && born <= THIS_YEAR ? '' : `Enter a year from 1900 to ${THIS_YEAR}.`,
  };
}

function ArtistForm({ artist, onSaved, onCancel }) {
  const toast = useToast();
  const photoId = useId();
  const fileInput = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [photoError, setPhotoError] = useState('');
  const form = useForm(
    { name: artist?.name || '', country: artist?.country || '', bornYear: artist ? String(artist.bornYear) : '', bio: artist?.bio || '', styles: (artist?.styles || []).map((s) => s.toLowerCase()) },
    validate,
  );

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const choose = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) return setPhotoError('Please choose a JPG, PNG or WEBP image.');
    if (file.size > MAX_PHOTO) return setPhotoError('That photo is over 2 MB. Please choose a smaller one.');
    setPhotoError('');
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    return undefined;
  };

  const onSubmit = form.submit(async (v) => {
    const fields = { name: v.name.trim(), country: v.country, bornYear: Number(v.bornYear), bio: v.bio.trim(), styles: v.styles, photo: photo || undefined };
    const result = artist ? await updateArtist(artist.id, fields) : await createArtist(fields);
    toast.success(`${result.artist.name} was saved.`);
    onSaved();
  });

  const select = form.field('country');

  return (
    <form ref={form.formRef} className="page-admin-artists__form" onSubmit={onSubmit} noValidate>
      <FormError message={form.formError} />
      <div className="page-admin-artists__pair">
        <TextField label="Name" labelStyle="caps" maxLength={80} autoComplete="off" {...form.field('name')} />
        <Select label="Country" labelStyle="caps" value={select.value} onChange={select.onChange} onBlur={select.onBlur} error={select.error} options={COUNTRIES} placeholder="Choose a country" />
      </div>
      <TextField label="Born" labelStyle="caps" type="number" inputMode="numeric" min={1900} max={THIS_YEAR} {...form.field('bornYear')} />
      <TextField as="textarea" label="Bio" labelStyle="caps" maxLength={3000} {...form.field('bio')} />
      <TagInput label="Styles" labelStyle="caps" value={form.values.styles} onChange={(value) => form.setValue('styles', value)} max={8} placeholder="Add a style" />
      <div className="field">
        <span className="field__label field__label--caps" id={`${photoId}-label`}>Photo</span>
        <div className="page-admin-artists__photo">
          <Avatar src={preview || artist?.portrait} name={form.values.name || 'New artist'} size={88} />
          <button type="button" className="page-admin-artists__upload" onClick={() => fileInput.current?.click()} aria-describedby={`${photoId}-hint`}>
            <Icon name="upload" size={20} />
            <span>
              <span className="page-admin-artists__upload-title">Upload new photo</span>
              <span id={`${photoId}-hint`} className="page-admin-artists__upload-hint">JPG, PNG or WEBP, up to 2 MB</span>
            </span>
          </button>
          <input ref={fileInput} type="file" hidden accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={choose} />
        </div>
        {photoError && <p className="field__error" role="alert">{photoError}</p>}
      </div>
      <div className="page-admin-artists__buttons">
        <Button type="submit" block loading={form.sending}>Save</Button>
        <Button variant="secondary" block onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default function Artists() {
  useDocumentTitle('Admin artists');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const list = useApi(() => listArtists(q || undefined), [q]);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const setQuery = (value) => {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value);
    else next.delete('q');
    setParams(next, { replace: true });
  };

  const askDelete = (artist) => {
    if (artist.works > 0) toast.error(STILL_HAS_WORK);
    else setToDelete(artist);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteArtist(toDelete.id);
      list.setData((data) => ({ ...data, items: data.items.filter((a) => a.id !== toDelete.id) }));
      toast.success(`${toDelete.name} was deleted.`);
      setToDelete(null);
    } catch (error) {
      toast.error(error.status === 409 ? STILL_HAS_WORK : error.message || 'We could not delete that artist. Please try again.');
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const actions = (a) => (
    <span className="admin-actions">
      <button type="button" className="admin-icon-button" onClick={() => setEditing(a)} aria-label={`Edit ${a.name}`}>
        <Icon name="pencil" size={18} />
      </button>
      <button type="button" className="admin-icon-button" onClick={() => askDelete(a)} aria-label={`Delete ${a.name}`}>
        <Icon name="trash" size={18} />
      </button>
    </span>
  );

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (a) => (
        <span className="page-admin-artists__who">
          <Avatar src={a.portrait} name={a.name} size={48} />
          <span className="page-admin-artists__name">{a.name}</span>
        </span>
      ),
    },
    { key: 'country', header: 'Country' },
    { key: 'bornYear', header: 'Born' },
    { key: 'works', header: 'Works' },
    { key: 'actions', header: 'Actions', render: actions },
  ];

  const items = list.data?.items || [];
  const empty = q ? 'No artists match your search.' : 'No artists yet.';

  return (
    <div className="page-admin-artists">
      <AdminHeader title="Artists">
        <AdminSearch value={q} onChange={setQuery} placeholder="Search artists" label="Search artists by name" />
        <Button size="sm" onClick={() => setEditing('new')} className="page-admin-artists__add">Add artist</Button>
      </AdminHeader>

      {list.error ? (
        <div className="admin-state admin-page-card" role="alert">
          <p>We could not load the artists.</p>
          <Button variant="secondary" size="sm" onClick={list.reload}>Try again</Button>
        </div>
      ) : (
        <>
          <p className="visually-hidden" role="status">{list.loading ? 'Loading artists' : `${items.length} artists`}</p>
          <div className="page-admin-artists__table">
            <DataTable columns={columns} rows={items} loading={list.loading} empty={empty} caption="Artists" />
          </div>
          <ul className="page-admin-artists__cards" aria-label="Artists">
            {list.loading && Array.from({ length: 4 }, (_, i) => <li key={i} className="page-admin-artists__card"><Skeleton variant="text" lines={2} /></li>)}
            {!list.loading && !items.length && <li className="admin-state admin-page-card">{empty}</li>}
            {!list.loading &&
              items.map((a) => (
                <li key={a.id} className="page-admin-artists__card">
                  <Avatar src={a.portrait} name={a.name} size={52} />
                  <div className="page-admin-artists__card-body">
                    <h2 className="page-admin-artists__name">{a.name}</h2>
                    <p className="page-admin-artists__meta">{a.country}, born {a.bornYear}</p>
                    <p className="page-admin-artists__meta">{a.works} {a.works === 1 ? 'work' : 'works'}</p>
                  </div>
                  {actions(a)}
                </li>
              ))}
          </ul>
        </>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add artist' : 'Edit artist'} size="md">
        {editing && (
          <ArtistForm
            artist={editing === 'new' ? null : editing}
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
        title={toDelete ? `Delete ${toDelete.name}?` : ''}
        size="sm"
        footer={
          <>
            <Button variant="danger" block loading={deleting} onClick={confirmDelete}>Delete artist</Button>
            <Button variant="secondary" block onClick={() => setToDelete(null)} disabled={deleting}>Cancel</Button>
          </>
        }
      >
        <p>This cannot be undone.</p>
      </Modal>
    </div>
  );
}
