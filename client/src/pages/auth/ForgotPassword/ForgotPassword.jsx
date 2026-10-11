import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { forgot } from '../../../api/auth.js';
import Button from '../../../components/ui/Button/Button.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { emailProblem, FormError, TextField, useForm } from '../form.jsx';
import './ForgotPassword.css';

export default function ForgotPassword() {
  useDocumentTitle('Forgot password');
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const form = useForm({ email: '' }, (v) => ({ email: emailProblem(v.email) }));

  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = form.submit(async ({ email }) => {
    await forgot(email.trim().toLowerCase());
    setSent(true);
  });

  return (
    <div className="page-forgot">
      <h1>Reset your password</h1>
      <p>Enter the email you registered with and we will send you a reset link.</p>
      {sent ? (
        <p className="page-forgot__sent" role="status">
          If that email is registered, a reset link is on its way. It expires in one hour.
        </p>
      ) : (
        <form ref={form.formRef} className="page-forgot__form" onSubmit={onSubmit} noValidate>
          <FormError message={form.formError} />
          <TextField label="Email" type="email" autoComplete="email" placeholder="you@example.com" {...form.field('email')} />
          <Button type="submit" block size="lg" loading={form.sending}>Send reset link</Button>
        </form>
      )}
      <Link to="/login" className="text-link page-forgot__back">Back to log in</Link>
    </div>
  );
}
