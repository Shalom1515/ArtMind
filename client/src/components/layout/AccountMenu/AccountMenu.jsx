import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useEscape } from '../../../hooks/useEscape.js';
import { useOnClickOutside } from '../../../hooks/useOnClickOutside.js';
import { cx } from '../../../utils/cx.js';
import { firstName } from '../../../utils/format.js';
import Avatar from '../../ui/Avatar/Avatar.jsx';
import Icon from '../../ui/Icon/Icon.jsx';
import './AccountMenu.css';

export default function AccountMenu({ tone = 'light', showName = true, align = 'right' }) {
  const { user, isAdmin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const close = useCallback(() => setOpen(false), []);

  useOnClickOutside(box, close, open);
  useEscape(close, open);

  if (!user) return null;

  const onLogout = async () => {
    close();
    await navigate('/');
    await logout();
    toast.info('You are logged out.');
  };

  const items = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/favourites', label: 'Favourites' },
    { to: '/profile', label: 'Profile' },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <div className={cx('account-menu', `account-menu--${tone}`)} ref={box}>
      <button
        type="button"
        className="account-menu__button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar src={user.avatar} name={user.name} size={32} />
        {showName && <span className="account-menu__name">{user.role === 'admin' && !user.name ? 'Admin' : firstName(user.name)}</span>}
        <Icon name="chevronDown" size={14} />
        <span className="visually-hidden">Account menu</span>
      </button>
      {open && (
        <div className={cx('account-menu__list', `account-menu__list--${align}`)} role="menu">
          <div className="account-menu__who">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          {items.map((item) => (
            <Link key={item.to} to={item.to} role="menuitem" className="account-menu__item" onClick={close}>
              {item.label}
            </Link>
          ))}
          <button type="button" role="menuitem" className="account-menu__item account-menu__item--logout" onClick={onLogout}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
