import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEscape } from '../../../hooks/useEscape.js';
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll.js';
import { cx } from '../../../utils/cx.js';
import Icon from '../Icon/Icon.jsx';
import './Modal.css';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ open, onClose, title, children, footer, size = 'md', closeOnOverlay = true, className }) {
  const dialog = useRef(null);
  const titleId = useId();
  const close = useCallback(() => onClose?.(), [onClose]);

  useEscape(close, open);
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const first = dialog.current?.querySelector(FOCUSABLE);
    (first || dialog.current)?.focus();
    return () => previous?.focus?.();
  }, [open]);

  if (!open) return null;

  const trapFocus = (event) => {
    if (event.key !== 'Tab') return;
    const items = [...dialog.current.querySelectorAll(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className="modal" onMouseDown={(e) => closeOnOverlay && e.target === e.currentTarget && close()}>
      <div
        ref={dialog}
        className={cx('modal__dialog', `modal__dialog--${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onKeyDown={trapFocus}
      >
        <div className="modal__head">
          {title && <h2 id={titleId} className="modal__title">{title}</h2>}
          <button type="button" className="modal__close" onClick={close} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
