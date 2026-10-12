import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { searchApi } from '../../../api/index.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useFavourites } from '../../../context/FavouritesContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { useDebounce } from '../../../hooks/useDebounce.js';
import { useOnClickOutside } from '../../../hooks/useOnClickOutside.js';
import { SITE_NAV } from '../../../utils/constants.js';
import { cx } from '../../../utils/cx.js';
import { placeholderBackground } from '../../../utils/placeholder.js';
import Avatar from '../../ui/Avatar/Avatar.jsx';
import Button from '../../ui/Button/Button.jsx';
import Icon from '../../ui/Icon/Icon.jsx';
import Logo from '../../ui/Logo/Logo.jsx';
import AccountMenu from '../AccountMenu/AccountMenu.jsx';
import MobileMenu, { MobileMenuSection } from '../MobileMenu/MobileMenu.jsx';
import './Header.css';

export function isNavActive(item, pathname) {
  return item.match.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function MatchedTitle({ title, query }) {
  const lower = title.toLowerCase();
  const q = query.toLowerCase();
  let at = lower.startsWith(q) ? 0 : lower.search(new RegExp(`[\\s'"(-]${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  at = at > 0 ? at + 1 : at;
  if (at < 0) at = lower.indexOf(q);
  if (at < 0 || !q) return title;
  return (
    <>
      {title.slice(0, at)}
      <mark className="search-suggest__match">{title.slice(at, at + q.length)}</mark>
      {title.slice(at + q.length)}
    </>
  );
}

export function SearchBox({ className, autoFocus, onDone, size = 'md' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [text, setText] = useState(location.pathname === '/search' ? params.get('q') || '' : '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [suggestions, setSuggestions] = useState([]);
  const [loadedFor, setLoadedFor] = useState('');
  const boxRef = useRef(null);
  const typed = text.trim();
  const query = useDebounce(typed, 150);
  const inputId = `search${size}`;
  const listId = `${inputId}-suggestions`;

  useEffect(() => {
    if (location.pathname === '/search') setText(params.get('q') || '');
  }, [location.pathname, params]);

  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      setLoadedFor('');
      return undefined;
    }
    const controller = new AbortController();
    searchApi
      .suggest(query, { limit: 6, signal: controller.signal })
      .then((data) => {
        setSuggestions(data?.suggestions || []);
        setLoadedFor(query);
        setActive(-1);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setSuggestions([]);
        setLoadedFor(query);
      });
    return () => controller.abort();
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  useOnClickOutside(boxRef, close, open);
  useEffect(close, [location.pathname, location.search, close]);

  const ready = loadedFor === typed;
  const showList = open && Boolean(typed) && ready;

  const choose = (painting) => {
    close();
    setText('');
    navigate(`/paintings/${painting.slug}`);
    onDone?.();
  };

  const submit = (event) => {
    event.preventDefault();
    if (showList && suggestions[active]) return choose(suggestions[active]);
    const q = text.trim();
    if (!q) return;
    close();
    navigate(`/search?q=${encodeURIComponent(q)}`);
    onDone?.();
  };

  const onKeyDown = (event) => {
    const count = suggestions.length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % count);
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? count - 1 : i - 1));
    } else if (event.key === 'Escape' && showList) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  return (
    <form role="search" ref={boxRef} className={cx('search-box', `search-box--${size}`, className)} onSubmit={submit}>
      <Icon name="search" size={16} className="search-box__icon" />
      <label className="visually-hidden" htmlFor={inputId}>Search the gallery</label>
      <input
        id={inputId}
        type="search"
        className="search-box__input"
        placeholder="Search the way you speak"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        maxLength={200}
        enterKeyHint="search"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
      />
      <div className={cx('search-suggest', showList && 'search-suggest--open')} hidden={!showList}>
        {suggestions.length ? (
          <ul id={listId} role="listbox" aria-label="Painting suggestions" className="search-suggest__list">
            {suggestions.map((p, i) => (
              <li
                key={p.slug}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={cx('search-suggest__item', i === active && 'search-suggest__item--active')}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
              >
                <span className="search-suggest__thumb" style={{ background: placeholderBackground(p.tones) }}>
                  {p.image && <img src={p.image} alt="" loading="lazy" decoding="async" />}
                </span>
                <span className="search-suggest__text">
                  <span className="search-suggest__title"><MatchedTitle title={p.title} query={typed} /></span>
                  <span className="search-suggest__meta">{[p.artist?.name, p.year].filter(Boolean).join(' · ')}</span>
                </span>
                <Icon name="arrowRight" size={14} className="search-suggest__go" />
              </li>
            ))}
          </ul>
        ) : (
          <p id={listId} className="search-suggest__empty">No painting titles match “{typed}”.</p>
        )}
        <button type="submit" className="search-suggest__all" onMouseDown={(e) => e.preventDefault()}>
          <span>Search everything for “{typed}”</span>
          <kbd>Enter</kbd>
        </button>
      </div>
    </form>
  );
}

export default function Header() {
  const { user, isAdmin, logout } = useAuth();
  const { count } = useFavourites();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const onLogout = async () => {
    setMenuOpen(false);
    await logout();
    toast.info('You are logged out.');
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Logo />

        <nav className="site-header__nav" aria-label="Main">
          {SITE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={() => cx('site-header__link', isNavActive(item, pathname) && 'site-header__link--active')}
              aria-current={isNavActive(item, pathname) ? 'page' : undefined}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="site-header__actions">
          <SearchBox className="site-header__search" size="sm" />
          {user ? (
            <div className="site-header__account">
              <Link to="/favourites" className="site-header__heart" aria-label={`Favourites, ${count} saved`}>
                <Icon name="heart" size={20} />
                {count > 0 && <span className="count-badge">{count > 99 ? '99+' : count}</span>}
              </Link>
              <AccountMenu />
            </div>
          ) : (
            <div className="site-header__account">
              <Link to="/login" className="site-header__login">Log in</Link>
              <Button to="/register" size="sm">Register</Button>
            </div>
          )}
        </div>

        <div className="site-header__compact">
          <button
            type="button"
            className="site-header__icon"
            onClick={() => setSearchOpen((v) => !v)}
            aria-expanded={searchOpen}
            aria-controls="header-search-row"
            aria-label={searchOpen ? 'Close search' : 'Search'}
          >
            <Icon name={searchOpen ? 'close' : 'search'} size={22} />
          </button>
          <button type="button" className="site-header__icon" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}>
            <Icon name="menu" size={24} />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div id="header-search-row" className="site-header__search-row">
          <div className="container">
            <SearchBox autoFocus size="lg" onDone={() => setSearchOpen(false)} />
          </div>
        </div>
      )}

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} label="Site menu">
        <MobileMenuSection>
          <SearchBox size="menu" onDone={() => setMenuOpen(false)} />
        </MobileMenuSection>
        <MobileMenuSection>
          <ul>
            <li>
              <NavLink to="/" end className="mobile-menu__link">Home</NavLink>
            </li>
            {SITE_NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={() => cx('mobile-menu__link', isNavActive(item, pathname) && 'active')}>
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink to="/contact" className="mobile-menu__link">Contact</NavLink>
            </li>
          </ul>
        </MobileMenuSection>
        <MobileMenuSection title="Account">
          {user ? (
            <>
              <div className="site-header__menu-user">
                <Avatar src={user.avatar} name={user.name} size={44} />
                <div>
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
              </div>
              <ul>
                <li><NavLink to="/dashboard" className="mobile-menu__link mobile-menu__link--small">Dashboard</NavLink></li>
                <li>
                  <NavLink to="/favourites" className="mobile-menu__link mobile-menu__link--small">
                    Favourites {count > 0 && <span className="muted">{count}</span>}
                  </NavLink>
                </li>
                <li><NavLink to="/profile" className="mobile-menu__link mobile-menu__link--small">Profile</NavLink></li>
                {isAdmin && <li><NavLink to="/admin" className="mobile-menu__link mobile-menu__link--small">Admin</NavLink></li>}
                <li>
                  <button type="button" className="mobile-menu__link mobile-menu__link--small" onClick={onLogout}>
                    Log out <Icon name="logout" size={18} />
                  </button>
                </li>
              </ul>
            </>
          ) : (
            <div className="site-header__menu-buttons">
              <Button to="/login" variant="secondary" block>Log in</Button>
              <Button to="/register" block>Register</Button>
            </div>
          )}
        </MobileMenuSection>
      </MobileMenu>
    </header>
  );
}
