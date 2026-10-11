import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './VerifyEmail.css';

export default function VerifyEmail() {
  useDocumentTitle('Verify your email');
  return (
    <div className="page-verify">
      <h1>Check your email</h1>
    </div>
  );
}
