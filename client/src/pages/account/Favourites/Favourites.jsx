import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './Favourites.css';

export default function Favourites() {
  useDocumentTitle('Favourites');
  return (
    <div className="page-favourites container page-head">
      <h1>Favourites</h1>
    </div>
  );
}
