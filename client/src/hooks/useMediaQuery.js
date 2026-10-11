import { useEffect, useState } from 'react';

export const PHONE = '(max-width: 639px)';
export const DESKTOP = '(min-width: 1024px)';

export function useMediaQuery(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export const useIsPhone = () => useMediaQuery(PHONE);
export const useIsDesktop = () => useMediaQuery(DESKTOP);
