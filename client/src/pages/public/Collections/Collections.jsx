import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './Collections.css';

export default function Collections() {
  useDocumentTitle('Collections');
  return (
    <div className="page-collections container page-head">
      <h1>Collections</h1>
    </div>
  );
}
