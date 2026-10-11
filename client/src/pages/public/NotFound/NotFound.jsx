import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './NotFound.css';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="page-notfound container page-head">
      <h1>This page is not in the gallery.</h1>
    </div>
  );
}
