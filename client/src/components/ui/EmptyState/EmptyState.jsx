import { cx } from '../../../utils/cx.js';
import FramedImage from '../FramedImage/FramedImage.jsx';
import './EmptyState.css';

export default function EmptyState({ title, text, action, image = '/images/states/empty_frame.jpg', className }) {
  return (
    <div className={cx('empty-state', className)}>
      {image && (
        <FramedImage src={image} alt="" ratio="3 / 2" tones={['#EAE2D3', '#D9D0C1', '#C8B59A']} className="empty-state__image" />
      )}
      <h2 className="empty-state__title">{title}</h2>
      {text && <p className="empty-state__text">{text}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
