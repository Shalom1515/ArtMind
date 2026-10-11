import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './SearchResults.css';

export default function SearchResults() {
  useDocumentTitle('Search');
  return (
    <div className="page-search container page-head">
      <h1>Search results</h1>
    </div>
  );
}
