import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './Contact.css';

export default function Contact() {
  useDocumentTitle('Contact');
  return (
    <div className="page-contact container page-head">
      <h1>Get in touch</h1>
    </div>
  );
}
