import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './Assistant.css';

export default function Assistant() {
  useDocumentTitle('Assistant');
  return (
    <div className="page-assistant container page-head">
      <h1>Ask ArtMind</h1>
    </div>
  );
}
