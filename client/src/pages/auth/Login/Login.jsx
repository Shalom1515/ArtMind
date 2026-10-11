import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './Login.css';

export default function Login() {
  useDocumentTitle('Log in');
  return (
    <div className="page-login">
      <h1>Welcome back</h1>
    </div>
  );
}
