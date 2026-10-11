import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './ArtistProfile.css';

export default function ArtistProfile() {
  useDocumentTitle('Artist');
  return (
    <div className="page-artist container page-head">
      <h1>Artist</h1>
    </div>
  );
}
