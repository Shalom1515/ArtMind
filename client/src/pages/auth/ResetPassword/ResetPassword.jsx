import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { reset } from '../../../api/auth.js';
import Button from '../../../components/ui/Button/Button.jsx';
import PasswordInput from '../../../components/ui/PasswordInput/PasswordInput.jsx';
import StrengthMeter from '../../../components/ui/StrengthMeter/StrengthMeter.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { FormError, newPasswordProblem, useForm } from '../form.jsx';
import './ResetPassword.css';

function validate(v) {
  return {
    password: newPasswordProblem(v.password),
    confirm: !v.confirm ? 'Enter your new password again.' : v.confirm !== v.password ? 'The passwords do not match.' : '',
  };
}

export default function ResetPassword() {
  useDocumentTitle('Reset password');
  const { token } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const [expired, setExpired] = useState(false);
  const form = useForm({ password: '', confirm: '' }, validate);

  const onSubmit = form.submit(async ({ password }) => {
    try {
      await reset({ token, password });
    } catch (error) {
      if (error.status === 400 && !Object.keys(error.fields || {}).length) {
        setExpired(true);
        return;
      }
      throw error;
    }
    toast.success('Your password has been changed. Please log in.');
    navigate('/login', { replace: true });
  });

  return (
    <div className="page-reset">
      <h1>Choose a new password</h1>
      {expired ? (
        <div className="page-reset__expired" role="alert">
          <p>This link has expired or was already used.</p>
          <Button to="/forgot" block size="lg">Request a new link</Button>
        </div>
      ) : (
        <form ref={form.formRef} className="page-reset__form" onSubmit={onSubmit} noValidate>
          <FormError message={form.formError} />
          <PasswordInput label="New password" autoComplete="new-password" {...form.field('password')}>
            <StrengthMeter password={form.values.password} />
          </PasswordInput>
          <PasswordInput label="Confirm new password" autoComplete="new-password" placeholder="Re-enter your password" {...form.field('confirm')} />
          <Button type="submit" block size="lg" loading={form.sending}>Reset password</Button>
        </form>
      )}
      <p className="page-reset__note">This link expires one hour after it was sent.</p>
      <Link to="/login" className="text-link page-reset__back">Back to log in</Link>
    </div>
  );
}
