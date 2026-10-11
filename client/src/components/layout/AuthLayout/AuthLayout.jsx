import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { getPainting } from '../../../api/paintings.js';
import { caption } from '../../../utils/format.js';
import FramedImage from '../../ui/FramedImage/FramedImage.jsx';
import Logo from '../../ui/Logo/Logo.jsx';
import './AuthLayout.css';

const ART = [
  { path: '/register', image: '/images/auth/register.jpg', ratio: '6 / 7', painting: { slug: 'dahlias-in-september', title: 'Dahlias in September', artist: { name: 'Elena Petrova' }, year: 2021, tones: ['#8E2027', '#E2735E', '#8F8C86'] } },
  { path: '/verify', image: '/images/auth/verify_email.jpg', ratio: '6 / 5', painting: { slug: 'hills-after-rain', title: 'Hills After Rain', artist: { name: 'Tomas Lindqvist' }, year: 2019, tones: ['#7FA35B', '#A9ADB0', '#E8E6DD'] } },
  { path: '/forgot', image: '/images/auth/forgot_password.jpg', ratio: '4 / 3', painting: { slug: 'harbour-haze', title: 'Harbour Haze', artist: { name: 'Henrik Vos' }, year: 2015, tones: ['#9C9E9B', '#6E757A', '#A2382C'] } },
  { path: '/reset', image: '/images/auth/reset_password.jpg', ratio: '4 / 3', painting: { slug: 'blue-ascension', title: 'Blue Ascension', artist: { name: 'Mariam Haddad' }, year: 2022, tones: ['#1C2B4F', '#5D82B8', '#C9DCEC'] } },
  { path: '/login', image: '/images/auth/login.jpg', ratio: '5 / 6', painting: { slug: 'dancer-resting', title: 'Dancer Resting', artist: { name: 'Clara Benedetti' }, year: 2019, tones: ['#E7C3C3', '#A9A6A3', '#C79A72'] } },
];

export default function AuthLayout() {
  const { pathname } = useLocation();
  const art = ART.find((a) => pathname.startsWith(a.path)) || ART[ART.length - 1];
  const [loaded, setLoaded] = useState({});

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const slug = art.painting.slug;
    if (loaded[slug]) return undefined;
    let cancelled = false;
    getPainting(slug)
      .then(({ painting }) => !cancelled && setLoaded((all) => ({ ...all, [slug]: painting })))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [art, loaded]);

  const painting = loaded[art.painting.slug] || art.painting;

  return (
    <div className="auth-layout">
      <header className="auth-layout__bar">
        <Logo size="lg" />
      </header>
      <div className="auth-layout__body">
        <aside className="auth-layout__art" aria-hidden="true">
          <FramedImage src={art.image} alt="" tones={painting.tones} ratio={art.ratio} frame="mat" caption={caption(painting)} loading="eager" />
        </aside>
        <main className="auth-layout__main" id="main">
          <div className="auth-layout__card">
            <Outlet />
          </div>
        </main>
      </div>
      <footer className="auth-layout__foot">&copy; {new Date().getFullYear()} ArtMind</footer>
    </div>
  );
}
