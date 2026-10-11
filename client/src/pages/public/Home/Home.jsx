import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './Home.css';

export default function Home() {
  useDocumentTitle('Home');
  return (
    <div className="page-home container page-head">
      <h1>Find the painting that was made for you.</h1>
    </div>
  );
}
