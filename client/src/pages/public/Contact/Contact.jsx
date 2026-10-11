import { useRef, useState } from 'react';
import { getFaq, sendContact } from '../../../api/contact.js';
import Accordion from '../../../components/ui/Accordion/Accordion.jsx';
import Button from '../../../components/ui/Button/Button.jsx';
import { ErrorState } from '../../../components/ui/EmptyState/EmptyState.jsx';
import Select from '../../../components/ui/Select/Select.jsx';
import Skeleton, { Loading } from '../../../components/ui/Skeleton/Skeleton.jsx';
import { useApi } from '../../../hooks/useApi.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { SUPPORT_EMAIL } from '../../../utils/constants.js';
import { isEmail } from '../../../utils/password.js';
import './Contact.css';

const SUBJECTS = [
  { value: 'General question', label: 'General question' },
  { value: 'A painting', label: 'A painting' },
  { value: 'An artist', label: 'An artist' },
  { value: 'My account', label: 'My account' },
  { value: 'Something is not working', label: 'Technical problem' },
  { value: 'Other', label: 'Other' },
];
const EMPTY = { name: '', email: '', subject: '', message: '' };

function check(name, value) {
  const text = String(value || '').trim();
  if (name === 'name') return text.length < 2 ? 'Enter your name.' : '';
  if (name === 'email') return !text ? 'Enter your email address.' : !isEmail(text) ? 'Enter a valid email address, like you@example.com.' : '';
  if (name === 'subject') return text ? '' : 'Choose a subject.';
  if (name === 'message') {
    if (text.length < 10) return 'Write at least 10 characters.';
    if (text.length > 2000) return 'Keep your message under 2000 characters.';
  }
  return '';
}

function ContactForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState('');
  const refs = { name: useRef(null), email: useRef(null), subject: useRef(null), message: useRef(null) };

  const set = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setDone(false);
    if (errors[name]) setErrors((e) => ({ ...e, [name]: check(name, value) }));
  };
  const blur = (name) => setErrors((e) => ({ ...e, [name]: check(name, values[name]) }));

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    for (const key of Object.keys(EMPTY)) {
      const problem = check(key, values[key]);
      if (problem) found[key] = problem;
    }
    setErrors(found);
    setFormError('');
    const first = Object.keys(EMPTY).find((k) => found[k]);
    if (first) {
      if (first === 'subject') document.getElementById('contactSubject')?.focus();
      else refs[first].current?.focus();
      return;
    }
    setSending(true);
    try {
      await sendContact({ ...values, name: values.name.trim(), email: values.email.trim(), message: values.message.trim() });
      setValues(EMPTY);
      setErrors({});
      setDone(true);
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      setFormError(err.message || 'We could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const field = (name, label, input) => (
    <div className="field">
      <label htmlFor={`contact${name}`} className="field__label">{label}</label>
      {input}
      {errors[name] && <p id={`contact${name}Error`} className="field__error">{errors[name]}</p>}
    </div>
  );
  const describe = (name) => (errors[name] ? `contact${name}Error` : undefined);

  return (
    <section className="card page-contact__form-card" aria-labelledby="formTitle">
      <h2 id="formTitle" className="page-contact__subtitle">Send us a message</h2>
      <form onSubmit={submit} noValidate className="page-contact__form">
        {field(
          'name',
          'Name',
          <input
            ref={refs.name}
            id="contactname"
            className="input"
            autoComplete="name"
            placeholder="Your name"
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            onBlur={() => blur('name')}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describe('name')}
          />,
        )}
        {field(
          'email',
          'Email',
          <input
            ref={refs.email}
            id="contactemail"
            type="email"
            className="input"
            autoComplete="email"
            placeholder="you@example.com"
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            onBlur={() => blur('email')}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describe('email')}
          />,
        )}
        <div onBlur={() => blur('subject')}>
          <Select
            id="contactSubject"
            label="Subject"
            placeholder="Select a subject"
            value={values.subject}
            onChange={(v) => set('subject', v)}
            options={SUBJECTS}
            error={errors.subject}
            required
          />
        </div>
        {field(
          'message',
          'Message',
          <textarea
            ref={refs.message}
            id="contactmessage"
            className="textarea"
            rows={6}
            placeholder="Type your message here..."
            value={values.message}
            onChange={(e) => set('message', e.target.value)}
            onBlur={() => blur('message')}
            maxLength={2000}
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={describe('message')}
          />,
        )}

        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="page-contact__send">
          <Button type="submit" size="lg" loading={sending}>Send message</Button>
        </div>
        <p className="page-contact__done" role="status">
          {done ? 'Thank you. We have your message and will reply by email.' : ''}
        </p>
      </form>
      <p className="page-contact__mail">
        Or write to <a href={`mailto:${SUPPORT_EMAIL}`} className="text-link">{SUPPORT_EMAIL}</a>
      </p>
    </section>
  );
}

export default function Contact() {
  useDocumentTitle('Contact');
  const faq = useApi(() => getFaq(), []);

  return (
    <div className="page-contact">
      <header className="page-contact__head">
        <div className="container page-head">
          <span className="label eyebrow">Contact</span>
          <h1>Get in touch</h1>
        </div>
      </header>

      <div className="container page-contact__body">
        <ContactForm />

        <section id="faq" className="page-contact__faq" aria-labelledby="faqTitle">
          <h2 id="faqTitle" className="page-contact__subtitle">Frequently asked questions</h2>
          {faq.loading && !faq.data && (
            <Loading label="Loading questions">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} height={22} className="page-contact__faq-skeleton" />
              ))}
            </Loading>
          )}
          {faq.error && <ErrorState error={faq.error} onRetry={faq.reload} title="We could not load the questions." />}
          {faq.data?.items?.length > 0 && <Accordion items={faq.data.items} defaultOpen={0} />}
        </section>
      </div>
    </div>
  );
}
