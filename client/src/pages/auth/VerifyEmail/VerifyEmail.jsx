import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { resendCode } from '../../../api/auth.js';
import Button from '../../../components/ui/Button/Button.jsx';
import CodeInput from '../../../components/ui/CodeInput/CodeInput.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { FormError, GENERAL_ERROR } from '../form.jsx';
import { clearPending, getPendingEmail, readDraft, saveDraft } from '../pending.js';
import './VerifyEmail.css';

const WAIT = 60;

function codeMessage(error) {
  const text = error?.message || '';
  if (/too many/i.test(text)) return 'Too many tries. Please ask for a new code.';
  if (/expired/i.test(text)) return 'That code has expired. Please ask for a new code.';
  return 'That code is not right. Please try again.';
}

export default function VerifyEmail() {
  useDocumentTitle('Verify email');
  const { verify } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email] = useState(getPendingEmail);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [resending, setResending] = useState(false);
  const [seconds, setSeconds] = useState(WAIT);
  const busy = useRef(false);
  const box = useRef(null);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  if (!email) return <Navigate to="/register" replace />;

  const focusFirstBox = () => requestAnimationFrame(() => box.current?.querySelector('input')?.focus());

  const submit = async (value = code) => {
    if (busy.current) return;
    if (value.length !== 6) {
      setError('Enter the six digit code.');
      focusFirstBox();
      return;
    }
    busy.current = true;
    setSending(true);
    setError('');
    setFormError('');
    try {
      await verify({ email, code: value });
      clearPending();
      toast.success('Your email is verified');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.status === 400) {
        setError(codeMessage(err));
        setCode('');
        focusFirstBox();
      } else {
        setFormError(err.message || GENERAL_ERROR);
      }
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    try {
      await resendCode(email);
      setSeconds(WAIT);
      setError('');
      setCode('');
      toast.success('A new code is on its way.');
      focusFirstBox();
    } catch (err) {
      toast.error(err.message || GENERAL_ERROR);
    } finally {
      setResending(false);
    }
  };

  const useDifferentEmail = () => {
    if (!readDraft()) saveDraft({ name: '', email, password: '', confirm: '', interests: [], agree: false });
    navigate('/register');
  };

  return (
    <div className="page-verify">
      <h1>Check your email</h1>
      <p>We sent a six digit code to {email}</p>
      <form
        className="page-verify__form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        noValidate
      >
        <FormError message={formError} />
        <div ref={box}>
          <CodeInput value={code} onChange={setCode} onComplete={submit} error={error} disabled={sending} label="Six digit code" />
        </div>
        <Button type="submit" block size="lg" loading={sending}>Verify email</Button>
      </form>
      <div className="page-verify__resend">
        <span>Did not get it?</span>
        {seconds > 0 ? (
          <span className="page-verify__timer" aria-live="off">Resend code in 0:{String(seconds).padStart(2, '0')}</span>
        ) : (
          <button type="button" className="text-link page-verify__link" onClick={onResend} disabled={resending}>
            Resend code
          </button>
        )}
      </div>
      <button type="button" className="text-link page-verify__link page-verify__other" onClick={useDifferentEmail}>
        Use a different email
      </button>
    </div>
  );
}
