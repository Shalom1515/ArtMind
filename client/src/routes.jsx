import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router-dom';
import App from './App.jsx';
import AdminLayout from './components/layout/AdminLayout/AdminLayout.jsx';
import AuthLayout from './components/layout/AuthLayout/AuthLayout.jsx';
import SiteLayout from './components/layout/SiteLayout/SiteLayout.jsx';
import { Loading } from './components/ui/Skeleton/Skeleton.jsx';
import { useAuth } from './context/AuthContext.jsx';

const page = (load) => () => load().then((module) => ({ Component: module.default }));

function Waiting() {
  return <Loading label="Checking your account" className="container page-head" />;
}

export function RequireUser() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <Waiting />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { user, isAdmin, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <Waiting />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        element: <SiteLayout />,
        children: [
          { path: '/', lazy: page(() => import('./pages/public/Home/Home.jsx')) },
          { path: '/gallery', lazy: page(() => import('./pages/public/Gallery/Gallery.jsx')) },
          { path: '/paintings/:slug', lazy: page(() => import('./pages/public/PaintingDetails/PaintingDetails.jsx')) },
          { path: '/search', lazy: page(() => import('./pages/public/SearchResults/SearchResults.jsx')) },
          { path: '/identify', lazy: page(() => import('./pages/public/IdentifyStyle/IdentifyStyle.jsx')) },
          { path: '/collections', lazy: page(() => import('./pages/public/Collections/Collections.jsx')) },
          { path: '/collections/:slug', lazy: page(() => import('./pages/public/CollectionDetail/CollectionDetail.jsx')) },
          { path: '/artists', lazy: page(() => import('./pages/public/Artists/Artists.jsx')) },
          { path: '/artists/:slug', lazy: page(() => import('./pages/public/ArtistProfile/ArtistProfile.jsx')) },
          { path: '/about', lazy: page(() => import('./pages/public/About/About.jsx')) },
          { path: '/contact', lazy: page(() => import('./pages/public/Contact/Contact.jsx')) },
          { path: '/assistant', lazy: page(() => import('./pages/account/Assistant/Assistant.jsx')) },
          {
            element: <RequireUser />,
            children: [
              { path: '/dashboard', lazy: page(() => import('./pages/account/Dashboard/Dashboard.jsx')) },
              { path: '/favourites', lazy: page(() => import('./pages/account/Favourites/Favourites.jsx')) },
              { path: '/profile/:tab?', lazy: page(() => import('./pages/account/Profile/Profile.jsx')) },
            ],
          },
          { path: '*', lazy: page(() => import('./pages/public/NotFound/NotFound.jsx')) },
        ],
      },
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', lazy: page(() => import('./pages/auth/Login/Login.jsx')) },
          { path: '/register', lazy: page(() => import('./pages/auth/Register/Register.jsx')) },
          { path: '/verify', lazy: page(() => import('./pages/auth/VerifyEmail/VerifyEmail.jsx')) },
          { path: '/forgot', lazy: page(() => import('./pages/auth/ForgotPassword/ForgotPassword.jsx')) },
          { path: '/reset/:token', lazy: page(() => import('./pages/auth/ResetPassword/ResetPassword.jsx')) },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [
          {
            path: '/admin',
            element: <AdminLayout />,
            children: [
              { index: true, lazy: page(() => import('./pages/admin/Overview/Overview.jsx')) },
              { path: 'paintings', lazy: page(() => import('./pages/admin/Paintings/Paintings.jsx')) },
              { path: 'paintings/new', lazy: page(() => import('./pages/admin/PaintingForm/PaintingForm.jsx')) },
              { path: 'paintings/:id/edit', lazy: page(() => import('./pages/admin/PaintingForm/PaintingForm.jsx')) },
              { path: 'artists', lazy: page(() => import('./pages/admin/Artists/Artists.jsx')) },
              { path: 'collections', lazy: page(() => import('./pages/admin/Collections/Collections.jsx')) },
              { path: 'users', lazy: page(() => import('./pages/admin/Users/Users.jsx')) },
              { path: 'messages', lazy: page(() => import('./pages/admin/Messages/Messages.jsx')) },
            ],
          },
        ],
      },
    ],
  },
]);
