import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button/Button.jsx';
import Checkbox from '../../../components/ui/Checkbox/Checkbox.jsx';
import PasswordInput from '../../../components/ui/PasswordInput/PasswordInput.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { firstName } from '../../../utils/format.js';
import { emailProblem, FormError, TextField, useForm } from '../form.jsx';
import { setPendingEmail } from '../pending.js';
import './Login.css';

const AUTH_PATHS = ['/login', '/register', '/verify', '/forgot', '/reset'];

function validate(values) {
  return {
    email: emailProblem(values.email),
    password: values.password ? '' : 'Enter your password.',
  };
}

export default function Login() {
  useDocumentTitle('Log in');
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [remember, setRemember] = useState(false);
  const loggingIn = useRef(false);
  const form = useForm({ email: '', password: '' }, validate);

  if (user && !loggingIn.current) return <Navigate to="/dashboard" replace />;

  const onSubmit = form.submit(async ({ email, password }) => {
    loggingIn.current = true;
    try {
      const signedIn = await login({ email: email.trim(), password, remember });
      const from = location.state?.from;
      const back = from && !AUTH_PATHS.some((p) => from.pathname?.startsWith(p)) ? `${from.pathname}${from.search || ''}${from.hash || ''}` : null;
      toast.success(`Welcome back, ${firstName(signedIn.name)}`);
      navigate(back || (signedIn.role === 'admin' ? '/admin' : '/dashboard'), { replace: true });
    } catch (error) {
      loggingIn.current = false;
      if (error.code === 'NOT_VERIFIED') {
        setPendingEmail(email);
        navigate('/verify');
        return;
      }
      if (error.status === 401) form.setFormError('That email and password do not match.');
      else if (error.status === 403) form.setFormError('This account has been deactivated. Please contact support.');
      else throw error;
    }
  });

  return (
    <div className="page-login">
      <h1>Welcome back</h1>
      <p>Log in to your ArtMind account</p>
      <form ref={form.formRef} className="page-login__form" onSubmit={onSubmit} noValidate>
        <FormError message={form.formError} />
        <TextField label="Email" type="email" autoComplete="email" placeholder="you@example.com" {...form.field('email')} />
        <PasswordInput label="Password" autoComplete="current-password" {...form.field('password')} />
        <div className="page-login__row">
          <Checkbox label="Remember me" checked={remember} onChange={setRemember} />
          <Link to="/forgot" className="text-link">Forgot password?</Link>
        </div>
        <Button type="submit" block size="lg" loading={form.sending}>Log in</Button>
      </form>
      <p className="page-login__foot">
        New to ArtMind? <Link to="/register" className="text-link">Create an account</Link>
      </p>
    </div>
  );
}
