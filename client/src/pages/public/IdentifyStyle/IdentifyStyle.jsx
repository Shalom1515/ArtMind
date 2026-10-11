import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './IdentifyStyle.css';

export default function IdentifyStyle() {
  useDocumentTitle('Identify a style');
  return (
    <div className="page-identify container page-head">
      <h1>Identify a style</h1>
    </div>
  );
}
