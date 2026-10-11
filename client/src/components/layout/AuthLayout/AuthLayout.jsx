import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import FramedImage from '../../ui/FramedImage/FramedImage.jsx';
import Logo from '../../ui/Logo/Logo.jsx';
import './AuthLayout.css';

const ART = [
  { path: '/register', image: '/images/auth/register.jpg', caption: 'Dahlias in September, Elena Petrova, 2021', tones: ['#8E2027', '#E2735E', '#8F8C86'], ratio: '6 / 7' },
  { path: '/verify', image: '/images/auth/verify_email.jpg', caption: 'Hills After Rain, Tomas Lindqvist, 2019', tones: ['#7FA35B', '#A9ADB0', '#E8E6DD'], ratio: '6 / 5' },
  { path: '/forgot', image: '/images/auth/forgot_password.jpg', caption: 'Harbour Haze, Henrik Vos, 2015', tones: ['#9C9E9B', '#6E757A', '#A2382C'], ratio: '4 / 3' },
  { path: '/reset', image: '/images/auth/reset_password.jpg', caption: 'Blue Ascension, Mariam Haddad, 2022', tones: ['#1C2B4F', '#5D82B8', '#C9DCEC'], ratio: '4 / 3' },
  { path: '/login', image: '/images/auth/login.jpg', caption: 'Dancer Resting, Clara Benedetti, 2019', tones: ['#E7C3C3', '#A9A6A3', '#C79A72'], ratio: '5 / 6' },
];

export default function AuthLayout() {
  const { pathname } = useLocation();
  const art = ART.find((a) => pathname.startsWith(a.path)) || ART[ART.length - 1];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="auth-layout">
      <header className="auth-layout__bar">
        <Logo size="lg" />
      </header>
      <div className="auth-layout__body">
        <aside className="auth-layout__art" aria-hidden="true">
          <FramedImage src={art.image} alt="" tones={art.tones} ratio={art.ratio} frame="mat" caption={art.caption} loading="eager" />
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
