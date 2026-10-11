import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { listMessages } from '../../../api/admin.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useDebounce } from '../../../hooks/useDebounce.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { ADMIN_NAV } from '../../../utils/constants.js';
import { cx } from '../../../utils/cx.js';
import Icon from '../../ui/Icon/Icon.jsx';
import { LogoMark } from '../../ui/Logo/Logo.jsx';
import AccountMenu from '../AccountMenu/AccountMenu.jsx';
import MobileMenu, { MobileMenuSection } from '../MobileMenu/MobileMenu.jsx';
import './AdminLayout.css';

function AdminBrand() {
  return (
    <Link to="/admin" className="admin-brand" aria-label="ArtMind Admin, overview">
      <LogoMark />
      <span>ArtMind Admin</span>
    </Link>
  );
}

export function AdminHeader({ title, children }) {
  return (
    <div className="admin-header">
      <h1 className="admin-header__title">{title}</h1>
      {children && <div className="admin-header__tools">{children}</div>}
      <div className="admin-header__account">
        <AccountMenu />
      </div>
    </div>
  );
}

export function AdminSearch({ value, onChange, placeholder, label }) {
  const id = useId();
  const [text, setText] = useState(value || '');
  const debounced = useDebounce(text, 300);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  useEffect(() => {
    setText(value || '');
  }, [value]);

  useEffect(() => {
    if (debounced.trim() !== (value || '')) changeRef.current(debounced.trim());
  }, [debounced]);

  return (
    <div className="admin-search" role="search">
      <label htmlFor={id} className="visually-hidden">{label || placeholder}</label>
      <Icon name="search" size={16} />
      <input id={id} type="search" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} maxLength={100} />
    </div>
  );
}

export function useAdminCounts() {
  return useOutletContext() || {};
}

export default function AdminLayout() {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [newMessages, setNewMessages] = useState(0);

  const refreshCounts = useCallback(async () => {
    try {
      const { counts } = await listMessages('new');
      setNewMessages(counts?.new || 0);
    } catch {
    }
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const onLogout = async () => {
    await navigate('/');
    await logout();
    toast.info('You are logged out.');
  };

  const links = (className) =>
    ADMIN_NAV.map((item) => (
      <li key={item.to}>
        <NavLink to={item.to} end={item.end} className={({ isActive }) => cx(className, isActive && 'active')}>
          {item.label}
          {item.to === '/admin/messages' && newMessages > 0 && (
            <span className="admin-layout__count">
              {newMessages}
              <span className="visually-hidden"> new</span>
            </span>
          )}
        </NavLink>
      </li>
    ));

  return (
    <div className="admin-layout">
      <a href="#main" className="skip-link">Skip to content</a>
      <aside className="admin-layout__sidebar">
        <AdminBrand />
        <nav aria-label="Admin">
          <ul className="admin-layout__nav">{links('admin-layout__link')}</ul>
        </nav>
        <hr className="admin-layout__rule" />
        <Link to="/" className="admin-layout__back">
          <Icon name="arrowLeft" size={18} /> Back to site
        </Link>
      </aside>

      <header className="admin-layout__bar">
        <AdminBrand />
        <div className="admin-layout__bar-right">
          <AccountMenu tone="dark" />
          <button type="button" className="admin-layout__menu-button" onClick={() => setMenuOpen(true)} aria-label="Open admin menu" aria-expanded={menuOpen}>
            <Icon name="menu" size={24} />
          </button>
        </div>
      </header>

      <main id="main" className="admin-layout__main" tabIndex={-1}>
        <Outlet context={{ refreshCounts, newMessages }} />
      </main>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} tone="dark" logoSuffix="Admin" label="Admin menu">
        <MobileMenuSection>
          <ul>{links('mobile-menu__link')}</ul>
        </MobileMenuSection>
        <MobileMenuSection>
          <ul>
            <li>
              <Link to="/" className="mobile-menu__link mobile-menu__link--small">
                <span>Back to site</span> <Icon name="arrowLeft" size={18} />
              </Link>
            </li>
            <li>
              <button type="button" className="mobile-menu__link mobile-menu__link--small" onClick={onLogout}>
                <span>Log out</span> <Icon name="logout" size={18} />
              </button>
            </li>
          </ul>
        </MobileMenuSection>
      </MobileMenu>
    </div>
  );
}
