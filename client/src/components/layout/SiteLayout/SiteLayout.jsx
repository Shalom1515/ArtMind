import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ChatLauncher from '../ChatLauncher/ChatLauncher.jsx';
import ChatPanel from '../ChatPanel/ChatPanel.jsx';
import Footer from '../Footer/Footer.jsx';
import Header from '../Header/Header.jsx';
import './SiteLayout.css';

export default function SiteLayout() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Header />
      <main id="main" className="site-main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <ChatLauncher />
      <ChatPanel />
    </>
  );
}
