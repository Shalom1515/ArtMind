import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './ResetPassword.css';

export default function ResetPassword() {
  useDocumentTitle('Choose a new password');
  return (
    <div className="page-reset">
      <h1>Choose a new password</h1>
    </div>
  );
}
