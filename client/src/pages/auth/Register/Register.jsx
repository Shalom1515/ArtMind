import { useId, useRef } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button/Button.jsx';
import Checkbox from '../../../components/ui/Checkbox/Checkbox.jsx';
import FilterChip from '../../../components/ui/FilterChip/FilterChip.jsx';
import PasswordInput from '../../../components/ui/PasswordInput/PasswordInput.jsx';
import StrengthMeter from '../../../components/ui/StrengthMeter/StrengthMeter.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { CATEGORIES } from '../../../utils/constants.js';
import { emailProblem, FormError, newPasswordProblem, TextField, useForm } from '../form.jsx';
import { readDraft, saveDraft, setPendingEmail } from '../pending.js';
import './Register.css';

const EMPTY = { name: '', email: '', password: '', confirm: '', interests: [], agree: false };

function validate(v) {
  const name = v.name.trim();
  return {
    name: !name || name.length < 2 ? 'Enter your full name.' : name.length > 60 ? 'Keep your name under 60 characters.' : '',
    email: emailProblem(v.email),
    password: newPasswordProblem(v.password),
    confirm: !v.confirm ? 'Enter your password again.' : v.confirm !== v.password ? 'The passwords do not match.' : '',
    interests: v.interests.length !== 3 ? 'Pick three categories.' : '',
    agree: v.agree ? '' : 'Please agree to the terms and the privacy policy.',
  };
}

export default function Register() {
  useDocumentTitle('Register');
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const chipsId = useId();
  const initial = useRef(readDraft() || EMPTY);
  const form = useForm(initial.current, validate);
  const { values, errors } = form;

  if (user) return <Navigate to="/dashboard" replace />;

  const toggleCategory = (name) => {
    const picked = values.interests.includes(name) ? values.interests.filter((c) => c !== name) : [...values.interests, name];
    form.setValue('interests', picked);
  };

  const onSubmit = form.submit(async (v) => {
    const email = v.email.trim().toLowerCase();
    try {
      await register({ name: v.name.trim(), email, password: v.password, interests: v.interests, agree: true });
    } catch (error) {
      if (error.status === 409) {
        form.setErrors({
          email: (
            <>
              An account with this email already exists. <Link to="/login" className="text-link">Log in</Link>
            </>
          ),
        });
        form.focusFirstError();
        return;
      }
      throw error;
    }
    saveDraft({ ...v, email });
    setPendingEmail(email);
    navigate('/verify');
  });

  return (
    <div className="page-register">
      <h1>Create your account</h1>
      <p>It is free, and your recommendations get better the more you look.</p>
      <form ref={form.formRef} className="page-register__form" onSubmit={onSubmit} noValidate>
        <FormError message={form.formError} />
        <TextField label="Full name" autoComplete="name" placeholder="Your full name" maxLength={60} {...form.field('name')} />
        <TextField label="Email" type="email" autoComplete="email" placeholder="you@example.com" {...form.field('email')} />
        <PasswordInput label="Password" autoComplete="new-password" {...form.field('password')}>
          <StrengthMeter password={values.password} />
        </PasswordInput>
        <PasswordInput label="Confirm password" autoComplete="new-password" placeholder="Re-enter your password" {...form.field('confirm')} />

        <fieldset className="page-register__chips" aria-describedby={errors.interests ? `${chipsId}-error` : undefined}>
          <legend className="label">Pick three categories you like</legend>
          <div className="page-register__chip-grid">
            {CATEGORIES.map((name) => {
              const on = values.interests.includes(name);
              return (
                <FilterChip key={name} selected={on} disabled={!on && values.interests.length >= 3} onToggle={() => toggleCategory(name)}>
                  {name}
                </FilterChip>
              );
            })}
          </div>
          {errors.interests && <p id={`${chipsId}-error`} className="field__error">{errors.interests}</p>}
        </fieldset>

        <Checkbox checked={values.agree} onChange={(checked) => form.setValue('agree', checked)} error={errors.agree}>
          I agree to the <Link to="/about" target="_blank" rel="noreferrer" className="text-link">terms</Link> and the{' '}
          <Link to="/about" target="_blank" rel="noreferrer" className="text-link">privacy policy</Link>
        </Checkbox>

        <Button type="submit" block size="lg" loading={form.sending}>Create account</Button>
      </form>
      <p className="page-register__foot">
        Already have an account? <Link to="/login" className="text-link">Log in</Link>
      </p>
    </div>
  );
}
