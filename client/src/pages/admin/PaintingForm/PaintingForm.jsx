import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createPainting, generateDetails, getPainting, listArtists, updatePainting } from '../../../api/admin.js';
import { AdminHeader } from '../../../components/layout/AdminLayout/AdminLayout.jsx';
import Button from '../../../components/ui/Button/Button.jsx';
import Checkbox from '../../../components/ui/Checkbox/Checkbox.jsx';
import FramedImage from '../../../components/ui/FramedImage/FramedImage.jsx';
import Icon from '../../../components/ui/Icon/Icon.jsx';
import Select from '../../../components/ui/Select/Select.jsx';
import Skeleton from '../../../components/ui/Skeleton/Skeleton.jsx';
import Swatch from '../../../components/ui/Swatch/Swatch.jsx';
import TagInput from '../../../components/ui/TagInput/TagInput.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { CATEGORIES } from '../../../utils/constants.js';
import { FormError, GENERAL_ERROR, TextField, useForm } from '../../auth/form.jsx';
import './PaintingForm.css';

const STYLES = ['Impressionism', 'Realism', 'Expressionism', 'Abstract expressionism', 'Colour field', 'Geometric abstraction', 'Ink wash', 'Still life', 'Contemporary', 'Folk', 'Renaissance revival', 'Baroque revival'];
const MEDIUMS = ['Oil', 'Acrylic', 'Watercolour', 'Gouache', 'Ink', 'Pastel', 'Charcoal', 'Tempera', 'Mixed media'];
const SURFACES = ['Canvas', 'Linen', 'Paper', 'Wood panel', 'Board'];
const MOODS = ['Calm', 'Energetic', 'Dramatic', 'Tender', 'Joyful', 'Melancholic', 'Solemn'];
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE = 5 * 1024 * 1024;
const THIS_YEAR = new Date().getFullYear();

const EMPTY = {
  title: '', artistSlug: '', year: '', category: '', style: '', medium: '', surface: '', widthCm: '', heightCm: '',
  mood: '', description: '', tags: [], summary: '', featured: false, palette: [], hasImage: false,
};

function wholeNumber(value, min, max) {
  const n = Number(value);
  return String(value).trim() !== '' && Number.isInteger(n) && n >= min && n <= max;
}

function validate(v) {
  return {
    title: v.title.trim() ? '' : 'Enter a title.',
    artistSlug: v.artistSlug ? '' : 'Choose an artist.',
    year: wholeNumber(v.year, 1900, THIS_YEAR) ? '' : `Enter a year from 1900 to ${THIS_YEAR}.`,
    category: v.category ? '' : 'Choose a category.',
    style: v.style ? '' : 'Choose a style.',
    medium: v.medium ? '' : 'Choose a medium.',
    surface: v.surface ? '' : 'Choose a surface.',
    widthCm: wholeNumber(v.widthCm, 10, 500) ? '' : 'Enter a width from 10 to 500 cm.',
    heightCm: wholeNumber(v.heightCm, 10, 500) ? '' : 'Enter a height from 10 to 500 cm.',
    mood: v.mood ? '' : 'Choose a mood.',
    image: v.hasImage ? '' : 'Add an image.',
  };
}

function fromPainting(p) {
  return {
    title: p.title || '', artistSlug: p.artistSlug || p.artist?.slug || '', year: String(p.year ?? ''), category: p.category || '',
    style: p.style || '', medium: p.medium || '', surface: p.surface || '', widthCm: String(p.widthCm ?? ''), heightCm: String(p.heightCm ?? ''),
    mood: p.mood || '', description: p.description || '', tags: p.tags || [], summary: p.summary || '', featured: Boolean(p.featured),
    palette: p.palette?.length ? p.palette : p.tones || [], hasImage: Boolean(p.image),
  };
}

export default function PaintingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const title = isEdit ? 'Edit painting' : 'Add painting';
  useDocumentTitle(title);
  const toast = useToast();
  const navigate = useNavigate();
  const imageError = useId();
  const fileInput = useRef(null);
  const artists = useApi(() => listArtists(), []);
  const existing = useApi(() => getPainting(id), [id], { enabled: isEdit });
  const form = useForm(EMPTY, validate);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [fileProblem, setFileProblem] = useState('');
  const [generating, setGenerating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    const painting = existing.data?.painting;
    if (painting && !loaded.current) {
      loaded.current = true;
      form.replaceValues(fromPainting(painting));
    }
  }, [existing.data, form]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const change = (name) => (value) => {
    setDirty(true);
    form.setValue(name, value);
  };

  const bind = (name) => {
    const f = form.field(name);
    return { ...f, onChange: change(name) };
  };

  const selectProps = (name, label, options, placeholder) => ({
    label,
    labelStyle: 'caps',
    value: form.values[name],
    onChange: change(name),
    onBlur: () => form.field(name).onBlur(),
    options,
    placeholder,
    error: form.errors[name],
  });

  const chooseImage = (event) => {
    const chosen = event.target.files?.[0];
    event.target.value = '';
    if (!chosen) return;
    if (!TYPES.includes(chosen.type)) {
      setFileProblem('Please choose a JPG, PNG or WEBP image.');
      return;
    }
    if (chosen.size > MAX_IMAGE) {
      setFileProblem('That image is over 5 MB. Please choose a smaller one.');
      return;
    }
    setFileProblem('');
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
    change('hasImage')(true);
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await generateDetails(file || id);
      setDirty(true);
      for (const key of ['style', 'mood', 'summary']) if (result[key]) form.setValue(key, result[key]);
      if (result.tags) form.setValue('tags', result.tags.map((t) => t.toLowerCase()).slice(0, 10));
      if (result.palette) form.setValue('palette', result.palette);
      toast.success('Style, tags, mood, summary and palette are filled in. Check them before saving.');
    } catch (error) {
      toast.error(error.message || GENERAL_ERROR);
    } finally {
      setGenerating(false);
    }
  };

  const onSubmit = form.submit(async (v) => {
    const fields = {
      title: v.title.trim(), artistSlug: v.artistSlug, year: Number(v.year), category: v.category, style: v.style, medium: v.medium,
      surface: v.surface, widthCm: Number(v.widthCm), heightCm: Number(v.heightCm), mood: v.mood, description: v.description.trim(),
      summary: v.summary.trim(), featured: v.featured, tags: v.tags, palette: v.palette, image: file || undefined,
    };
    if (isEdit) await updatePainting(id, fields);
    else await createPainting(fields);
    setDirty(false);
    toast.success(`${fields.title} was saved.`);
    navigate('/admin/paintings');
  });

  const header = (
    <AdminHeader title={title}>
      <Link to="/admin/paintings" className="page-admin-paintingform__back">
        <Icon name="arrowLeft" size={16} /> Back to paintings
      </Link>
    </AdminHeader>
  );

  if (isEdit && existing.error) {
    const missing = existing.error.status === 404;
    return (
      <div className="page-admin-paintingform">
        {header}
        <div className="admin-state admin-page-card" role="alert">
          <p>{missing ? 'We could not find that painting. It may have been deleted.' : 'We could not load this painting.'}</p>
          {missing ? <Button to="/admin/paintings" variant="secondary" size="sm">Back to paintings</Button> : <Button variant="secondary" size="sm" onClick={existing.reload}>Try again</Button>}
        </div>
      </div>
    );
  }

  if (isEdit && !loaded.current) {
    return (
      <div className="page-admin-paintingform">
        {header}
        <div className="page-admin-paintingform__grid" role="status">
          <span className="visually-hidden">Loading the painting</span>
          <div className="admin-page-card page-admin-paintingform__card"><Skeleton variant="text" lines={8} /></div>
          <div className="admin-page-card page-admin-paintingform__card"><Skeleton ratio="4 / 3" variant="card" /></div>
        </div>
      </div>
    );
  }

  const v = form.values;
  const image = preview || existing.data?.painting?.image;
  const artistOptions = (artists.data?.items || []).map((a) => ({ value: a.slug, label: a.name }));
  const imageMessage = fileProblem || form.errors.image;

  return (
    <div className="page-admin-paintingform">
      {header}
      <form ref={form.formRef} className="page-admin-paintingform__grid" onSubmit={onSubmit} noValidate>
        <section className="admin-page-card page-admin-paintingform__card page-admin-paintingform__image" aria-labelledby="imageLabel">
          <h2 id="imageLabel" className="label label--ink">Image</h2>
          {v.hasImage ? (
            <>
              <FramedImage src={image} alt={v.title ? `Image of ${v.title}` : 'Chosen image'} tones={v.palette} ratio="4 / 3" fit="contain" className="page-admin-paintingform__preview" />
              <button type="button" className="caps-link page-admin-paintingform__replace" onClick={() => fileInput.current?.click()} aria-describedby={imageMessage ? imageError : undefined}>
                Replace image
              </button>
            </>
          ) : (
            <button
              type="button"
              className="page-admin-paintingform__drop"
              onClick={() => fileInput.current?.click()}
              aria-invalid={form.errors.image ? true : undefined}
              aria-describedby={imageMessage ? imageError : undefined}
            >
              <Icon name="upload" size={22} />
              <span>Upload image</span>
              <span className="page-admin-paintingform__drop-hint">JPG, PNG or WEBP, up to 5 MB</span>
            </button>
          )}
          <input ref={fileInput} type="file" hidden accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={chooseImage} />
          {imageMessage && <p id={imageError} className="field__error" role="alert">{imageMessage}</p>}

          <Button variant="secondary" block onClick={generate} disabled={!v.hasImage} loading={generating} className="page-admin-paintingform__generate">
            Generate tags and summary
          </Button>
          <p className="page-admin-paintingform__hint">Fills style, tags, mood, summary and palette from the image. You can edit everything before saving.</p>

          <h3 className="label label--ink page-admin-paintingform__palette-label">Palette</h3>
          {v.palette.length ? (
            <ul className="page-admin-paintingform__palette">
              {v.palette.map((colour) => (
                <li key={colour}><Swatch colour={colour} label={colour} size="fill" /></li>
              ))}
            </ul>
          ) : (
            <p className="page-admin-paintingform__hint">The palette appears here once it is generated.</p>
          )}
        </section>

        <section className="admin-page-card page-admin-paintingform__card page-admin-paintingform__fields" aria-label="Painting details">
          <FormError message={form.formError} />
          <TextField label="Title" labelStyle="caps" maxLength={120} {...bind('title')} />
          <Select
            {...selectProps('artistSlug', 'Artist', artistOptions, artists.loading ? 'Loading artists' : 'Select artist')}
            hint={artists.error ? 'We could not load the artists. Reload the page to try again.' : undefined}
          />
          <div className="page-admin-paintingform__pair">
            <TextField label="Year" labelStyle="caps" type="number" inputMode="numeric" min={1900} max={THIS_YEAR} {...bind('year')} />
            <Select {...selectProps('category', 'Category', CATEGORIES, 'Select category')} />
          </div>
          <div className="page-admin-paintingform__pair">
            <Select {...selectProps('style', 'Style', STYLES, 'Select style')} />
            <Select {...selectProps('medium', 'Medium', MEDIUMS, 'Select medium')} />
          </div>
          <div className="page-admin-paintingform__pair">
            <Select {...selectProps('surface', 'Surface', SURFACES, 'Select surface')} />
            <TextField label="Width cm" labelStyle="caps" type="number" inputMode="numeric" min={10} max={500} {...bind('widthCm')} />
          </div>
          <div className="page-admin-paintingform__pair">
            <TextField label="Height cm" labelStyle="caps" type="number" inputMode="numeric" min={10} max={500} {...bind('heightCm')} />
            <Select {...selectProps('mood', 'Mood', MOODS, 'Select mood')} />
          </div>
          <TextField as="textarea" label="Description" labelStyle="caps" maxLength={2000} {...bind('description')} />
          <TagInput label="Tags" labelStyle="caps" value={v.tags} onChange={change('tags')} max={10} hint="Press Enter or a comma to add a tag. Up to 10." />
          <TextField as="textarea" label="Summary" labelStyle="caps" maxLength={600} {...bind('summary')} />
          <Checkbox label="Featured" checked={v.featured} onChange={change('featured')} />
          <div className="page-admin-paintingform__buttons">
            <Button type="submit" loading={form.sending}>Save painting</Button>
            <Button variant="secondary" to="/admin/paintings">Cancel</Button>
          </div>
        </section>
      </form>
    </div>
  );
}
