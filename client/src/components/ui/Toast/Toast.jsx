import { cx } from '../../../utils/cx.js';
import Icon from '../Icon/Icon.jsx';
import './Toast.css';

const ICONS = { success: 'check', error: 'alert', info: 'info' };

export function Toast({ toast, onDismiss }) {
  const { id, type = 'info', message, action } = toast;
  return (
    <div className={cx('toast', `toast--${type}`)} role={type === 'error' ? 'alert' : 'status'}>
      <Icon name={ICONS[type]} size={18} className="toast__icon" />
      <p className="toast__message">{message}</p>
      {action && (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            action.onClick();
            onDismiss(id);
          }}
        >
          {action.label}
        </button>
      )}
      <button type="button" className="toast__close" onClick={() => onDismiss(id)} aria-label="Dismiss">
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

export default function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
