import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './PaintingDetails.css';

export default function PaintingDetails() {
  useDocumentTitle('Painting');
  return (
    <div className="page-painting container page-head">
      <h1>Painting details</h1>
    </div>
  );
}
