import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as favouritesApi from '../api/favourites.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const FavouritesContext = createContext(null);

export function FavouritesProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [slugs, setSlugs] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const pending = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setSlugs(new Set());
      return undefined;
    }
    setLoading(true);
    favouritesApi
      .getFavouriteSlugs()
      .then(({ slugs: saved }) => !cancelled && setSlugs(new Set(saved)))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isSaved = useCallback((slug) => slugs.has(slug), [slugs]);

  const toggle = useCallback(
    async (paintingOrSlug) => {
      const slug = typeof paintingOrSlug === 'string' ? paintingOrSlug : paintingOrSlug?.slug;
      const title = typeof paintingOrSlug === 'object' ? paintingOrSlug.title : 'This painting';
      if (!slug) return false;
      if (!user) {
        toast.info('Log in to save paintings to your favourites.', {
          action: { label: 'Log in', onClick: () => navigate('/login', { state: { from: location } }) },
        });
        return false;
      }
      if (pending.current.has(slug)) return slugs.has(slug);
      pending.current.add(slug);

      const wasSaved = slugs.has(slug);
      const flip = (save) =>
        setSlugs((current) => {
          const next = new Set(current);
          if (save) next.add(slug);
          else next.delete(slug);
          return next;
        });

      flip(!wasSaved);
      try {
        if (wasSaved) {
          await favouritesApi.removeFavourite(slug);
          toast.show(`${title} removed from favourites.`, { action: { label: 'Undo', onClick: () => toggle(paintingOrSlug) } });
        } else {
          await favouritesApi.addFavourite(slug);
          toast.success(`${title} saved to favourites.`);
        }
        return !wasSaved;
      } catch (error) {
        flip(wasSaved);
        toast.error(error.message || 'We could not update your favourites. Please try again.');
        return wasSaved;
      } finally {
        pending.current.delete(slug);
      }
    },
    [user, slugs, toast, navigate, location],
  );

  const value = useMemo(() => ({ slugs, count: slugs.size, loading, isSaved, toggle }), [slugs, loading, isSaved, toggle]);

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
}

export function useFavourites() {
  const context = useContext(FavouritesContext);
  if (!context) throw new Error('useFavourites must be used inside FavouritesProvider');
  return context;
}
