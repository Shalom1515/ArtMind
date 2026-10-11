import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL, TAGLINE } from '../../../utils/constants.js';
import './Footer.css';

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { to: '/gallery', label: 'Gallery' },
      { to: '/collections', label: 'Collections' },
      { to: '/artists', label: 'Artists' },
      { to: '/identify', label: 'Identify a Style' },
      { to: '/assistant', label: 'Assistant' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/login', label: 'Log in' },
      { to: '/register', label: 'Register' },
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/favourites', label: 'Favourites' },
      { to: '/profile', label: 'Profile' },
    ],
  },
  {
    title: 'About',
    links: [
      { to: '/about', label: 'About ArtMind' },
      { to: '/contact', label: 'Contact' },
      { to: '/contact#faq', label: 'FAQ' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <section className="site-footer__col site-footer__brand">
            <h2 className="site-footer__title">ArtMind</h2>
            <p>{TAGLINE}</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="site-footer__mail">{SUPPORT_EMAIL}</a>
          </section>
          {COLUMNS.map((column) => (
            <nav key={column.title} className="site-footer__col" aria-label={column.title}>
              <h2 className="site-footer__title">{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="site-footer__bottom">&copy; {new Date().getFullYear()} ArtMind. Built by Stanley, Amanda and Shalom.</p>
      </div>
    </footer>
  );
}
