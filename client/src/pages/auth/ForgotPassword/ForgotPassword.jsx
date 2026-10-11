import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './ForgotPassword.css';

export default function ForgotPassword() {
  useDocumentTitle('Forgot password');
  return (
    <div className="page-forgot">
      <h1>Reset your password</h1>
    </div>
  );
}
