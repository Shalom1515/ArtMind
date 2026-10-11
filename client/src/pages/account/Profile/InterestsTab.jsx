import { useId, useState } from 'react';
import { updateInterests } from '../../../api/me.js';
import { getOptions } from '../../../api/paintings.js';
import Button from '../../../components/ui/Button/Button.jsx';
import FilterChip from '../../../components/ui/FilterChip/FilterChip.jsx';
import Skeleton from '../../../components/ui/Skeleton/Skeleton.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { CATEGORIES } from '../../../utils/constants.js';
import { FormError, GENERAL_ERROR } from '../../auth/form.jsx';

const flip = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

export default function InterestsTab() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const errorId = useId();
  const options = useApi(() => getOptions(), []);
  const [categories, setCategories] = useState(() => (user.interests || []).filter((c) => CATEGORIES.includes(c)));
  const [styles, setStyles] = useState(user.styles || []);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);

  const toggleCategory = (name) => {
    const next = flip(categories, name);
    setCategories(next);
    if (next.length) setError('');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!categories.length) {
      setError('Pick at least one category.');
      return;
    }
    setSending(true);
    setFormError('');
    try {
      const { user: saved } = await updateInterests(categories, styles);
      setUser(saved);
      toast.success('Your interests are saved. Recommendations will follow them.');
    } catch (err) {
      setFormError(err.fields?.interests || err.message || GENERAL_ERROR);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <h2 id="profilePanelTitle" className="page-profile__title">Your interests</h2>
      <form className="page-profile__form" onSubmit={onSubmit} noValidate>
        <FormError message={formError} />
        <fieldset className="page-profile__chips" aria-describedby={error ? errorId : undefined}>
          <legend className="label">Categories</legend>
          <div className="page-profile__chip-list">
            {CATEGORIES.map((name) => (
              <FilterChip key={name} selected={categories.includes(name)} onToggle={() => toggleCategory(name)}>
                {name}
              </FilterChip>
            ))}
          </div>
          {error && <p id={errorId} className="field__error" role="alert">{error}</p>}
        </fieldset>
        <fieldset className="page-profile__chips">
          <legend className="label">Styles</legend>
          {options.loading && <Skeleton height={38} />}
          {options.error && (
            <p className="field__error">
              We could not load the styles. <button type="button" className="text-link" onClick={options.reload}>Try again</button>
            </p>
          )}
          {options.data && (
            <div className="page-profile__chip-list">
              {options.data.styles.map((name) => (
                <FilterChip key={name} selected={styles.includes(name)} onToggle={() => setStyles((list) => flip(list, name))}>
                  {name}
                </FilterChip>
              ))}
            </div>
          )}
        </fieldset>
        <div>
          <Button type="submit" loading={sending} className="page-profile__submit">Save interests</Button>
        </div>
      </form>
    </>
  );
}
