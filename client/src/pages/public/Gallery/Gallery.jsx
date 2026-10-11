import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './Gallery.css';

export default function Gallery() {
  useDocumentTitle('Gallery');
  return (
    <div className="page-gallery container page-head">
      <h1>Gallery</h1>
    </div>
  );
}
