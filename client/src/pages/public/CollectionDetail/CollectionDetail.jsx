import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './CollectionDetail.css';

export default function CollectionDetail() {
  useDocumentTitle('Collection');
  return (
    <div className="page-collection container page-head">
      <h1>Collection</h1>
    </div>
  );
}
