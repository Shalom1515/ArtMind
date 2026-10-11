import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEscape } from '../../../hooks/useEscape.js';
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll.js';
import { cx } from '../../../utils/cx.js';
import Icon from '../../ui/Icon/Icon.jsx';
import Logo from '../../ui/Logo/Logo.jsx';
import './MobileMenu.css';

export default function MobileMenu({ open, onClose, tone = 'light', logoSuffix, label = 'Menu', children }) {
  const panel = useRef(null);
  useEscape(onClose, open);
  useLockBodyScroll(open);

  useEffect(() => {
    if (open) panel.current?.querySelector('button, a')?.focus();
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className={cx('mobile-menu', `mobile-menu--${tone}`)} role="dialog" aria-modal="true" aria-label={label}>
      <div className="mobile-menu__panel" ref={panel}>
        <div className="mobile-menu__top">
          <Logo tone={tone === 'dark' ? 'light' : 'dark'} suffix={logoSuffix} size="sm" />
          <button type="button" className="mobile-menu__close" onClick={onClose} aria-label="Close menu">
            <Icon name="close" size={24} />
          </button>
        </div>
        <div className="mobile-menu__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function MobileMenuSection({ title, children }) {
  return (
    <section className="mobile-menu__section">
      {title && <h2 className="mobile-menu__heading">{title}</h2>}
      {children}
    </section>
  );
}
