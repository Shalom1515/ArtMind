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
  const [ready, setReady] = useState(false);
  const pending = useRef(new Set());
  const slugsRef = useRef(slugs);
  slugsRef.current = slugs;

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    if (!user) {
      setSlugs(new Set());
      return undefined;
    }
    setLoading(true);
    favouritesApi
      .getFavouriteSlugs()
      .then(({ slugs: saved }) => !cancelled && setSlugs(new Set(saved)))
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isSaved = useCallback((slug) => slugs.has(slug), [slugs]);

  const flip = useCallback((slug, save) => {
    setSlugs((current) => {
      const next = new Set(current);
      if (save) next.add(slug);
      else next.delete(slug);
      return next;
    });
  }, []);

  const askToLogIn = useCallback(() => {
    toast.info('Log in to save favourites');
    navigate('/login', { state: { from: location } });
  }, [toast, navigate, location]);

  const setSaved = useCallback(
    async (paintingOrSlug, save) => {
      const slug = typeof paintingOrSlug === 'string' ? paintingOrSlug : paintingOrSlug?.slug;
      const title = typeof paintingOrSlug === 'object' && paintingOrSlug?.title ? paintingOrSlug.title : 'This painting';
      if (!slug) return false;
      if (!user) {
        askToLogIn();
        return false;
      }
      const wasSaved = slugsRef.current.has(slug);
      if (pending.current.has(slug) || wasSaved === save) return wasSaved;
      pending.current.add(slug);
      flip(slug, save);
      try {
        if (save) {
          await favouritesApi.addFavourite(slug);
          toast.success(`${title} saved to favourites.`);
        } else {
          await favouritesApi.removeFavourite(slug);
          toast.show(`${title} removed from favourites.`, {
            action: { label: 'Undo', onClick: () => setSavedRef.current(paintingOrSlug, true) },
          });
        }
        return save;
      } catch (error) {
        flip(slug, wasSaved);
        toast.error(error.message || 'We could not update your favourites. Please try again.');
        return wasSaved;
      } finally {
        pending.current.delete(slug);
      }
    },
    [user, toast, flip, askToLogIn],
  );

  const setSavedRef = useRef(setSaved);
  setSavedRef.current = setSaved;

  const toggle = useCallback(
    (paintingOrSlug) => {
      const slug = typeof paintingOrSlug === 'string' ? paintingOrSlug : paintingOrSlug?.slug;
      return setSaved(paintingOrSlug, !slugsRef.current.has(slug));
    },
    [setSaved],
  );

  const save = useCallback((painting) => setSaved(painting, true), [setSaved]);
  const remove = useCallback((painting) => setSaved(painting, false), [setSaved]);

  const value = useMemo(
    () => ({ slugs, count: slugs.size, loading, ready, isSaved, toggle, save, remove }),
    [slugs, loading, ready, isSaved, toggle, save, remove],
  );

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
}

export function useFavourites() {
  const context = useContext(FavouritesContext);
  if (!context) throw new Error('useFavourites must be used inside FavouritesProvider');
  return context;
}
