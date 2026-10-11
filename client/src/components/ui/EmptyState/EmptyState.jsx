import { cx } from '../../../utils/cx.js';
import Button from '../Button/Button.jsx';
import FramedImage from '../FramedImage/FramedImage.jsx';
import './EmptyState.css';

export default function EmptyState({ title, text, action, image = '/images/states/empty_frame.jpg', className, children }) {
  return (
    <div className={cx('empty-state', className)}>
      {image && (
        <FramedImage src={image} alt="" ratio="3 / 2" tones={['#EAE2D3', '#D9D0C1', '#C8B59A']} className="empty-state__image" />
      )}
      <h2 className="empty-state__title">{title}</h2>
      {text && <p className="empty-state__text">{text}</p>}
      {children}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Something went wrong.', className }) {
  return (
    <div role="alert">
      <EmptyState
        image={null}
        title={title}
        text={error?.message || 'Please try again.'}
        className={cx('empty-state--error', className)}
        action={onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
      />
    </div>
  );
}
