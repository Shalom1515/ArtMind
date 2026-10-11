import { useEffect, useId, useRef, useState } from 'react';
import { updateDetails, uploadPhoto } from '../../../api/me.js';
import Avatar from '../../../components/ui/Avatar/Avatar.jsx';
import Button from '../../../components/ui/Button/Button.jsx';
import Select from '../../../components/ui/Select/Select.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { COUNTRIES } from '../../../utils/countries.js';
import { FormError, TextField, useForm } from '../../auth/form.jsx';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO = 2 * 1024 * 1024;
const BIO_MAX = 300;

function validate(v) {
  const name = v.name.trim();
  return {
    name: !name || name.length < 2 ? 'Enter your full name.' : name.length > 60 ? 'Keep your name under 60 characters.' : '',
    bio: v.bio.length > BIO_MAX ? `Keep your bio under ${BIO_MAX} characters.` : '',
  };
}

export default function DetailsTab() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const fileInput = useRef(null);
  const photoHint = useId();
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [photoError, setPhotoError] = useState('');
  const form = useForm({ name: user.name || '', bio: user.bio || '', country: user.country || '' }, validate);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const choosePhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      setPhotoError('Please choose a JPG, PNG or WEBP image.');
      return;
    }
    if (file.size > MAX_PHOTO) {
      setPhotoError('That photo is over 2 MB. Please choose a smaller one.');
      return;
    }
    setPhotoError('');
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const dropPhoto = () => {
    setPhoto(null);
    setPreview('');
  };

  const onSubmit = form.submit(async (v) => {
    let latest = user;
    if (photo) {
      latest = (await uploadPhoto(photo)).user;
      setUser(latest);
      dropPhoto();
    }
    const changes = {};
    if (v.name.trim() !== (user.name || '')) changes.name = v.name.trim();
    if (v.bio !== (user.bio || '')) changes.bio = v.bio;
    if (v.country !== (user.country || '')) changes.country = v.country;
    if (Object.keys(changes).length) latest = (await updateDetails(changes)).user;
    setUser(latest);
    toast.success('Your details are saved');
  });

  return (
    <>
      <h2 id="profilePanelTitle" className="page-profile__title">Your details</h2>
      <form ref={form.formRef} className="page-profile__form" onSubmit={onSubmit} noValidate>
        <FormError message={form.formError} />
        <div className="page-profile__photo">
          <Avatar src={preview || user.avatar} name={user.name} size={120} />
          <div className="page-profile__photo-tools">
            <Button variant="secondary" onClick={() => fileInput.current?.click()} aria-describedby={photoHint}>
              Change photo
            </Button>
            <input ref={fileInput} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden onChange={choosePhoto} />
            <p id={photoHint} className={photoError ? 'field__error' : 'field__hint'} role={photoError ? 'alert' : undefined}>
              {photoError || 'JPG, PNG or WEBP, up to 2 MB'}
            </p>
            {preview && (
              <p className="field__hint">
                New photo ready. It is saved with your changes.{' '}
                <button type="button" className="text-link" onClick={dropPhoto}>Keep the old one</button>
              </p>
            )}
          </div>
        </div>
        <TextField label="Full name" autoComplete="name" maxLength={60} {...form.field('name')} />
        <TextField
          as="textarea"
          label="Bio"
          maxLength={BIO_MAX}
          hint={`${form.values.bio.length} of ${BIO_MAX} characters`}
          {...form.field('bio')}
        />
        <Select
          label="Country"
          value={form.values.country}
          onChange={(value) => form.setValue('country', value)}
          options={COUNTRIES}
          placeholder="Choose your country"
        />
        <div>
          <Button type="submit" loading={form.sending} className="page-profile__submit">Save changes</Button>
        </div>
      </form>
    </>
  );
}
