import Button from '../../../components/ui/Button/Button.jsx';
import FramedImage from '../../../components/ui/FramedImage/FramedImage.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import './NotFound.css';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="page-notfound container">
      <FramedImage
        src="/images/states/not_found.jpg"
        alt="The corner of an empty picture frame"
        ratio="1 / 1"
        frame="mat"
        tones={['#7E8F6B', '#C9A04A', '#4A3524']}
        loading="eager"
        className="page-notfound__image"
      />
      <h1 className="page-notfound__title">This page is not in the gallery.</h1>
      <p className="page-notfound__text">The link may be old or mistyped.</p>
      <div className="page-notfound__buttons">
        <Button to="/" size="lg">Go home</Button>
        <Button to="/gallery" variant="secondary" size="lg">Open the gallery</Button>
      </div>
    </div>
  );
}
