import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './Artists.css';

export default function Artists() {
  useDocumentTitle('Artists');
  return (
    <div className="page-artists container page-head">
      <h1>Artists</h1>
    </div>
  );
}
