import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './About.css';

export default function About() {
  useDocumentTitle('About');
  return (
    <div className="page-about container page-head">
      <h1>A gallery that helps you find what you will love.</h1>
    </div>
  );
}
