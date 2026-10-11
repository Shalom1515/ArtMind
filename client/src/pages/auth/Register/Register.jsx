import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './Register.css';

export default function Register() {
  useDocumentTitle('Register');
  return (
    <div className="page-register">
      <h1>Create your account</h1>
    </div>
  );
}
