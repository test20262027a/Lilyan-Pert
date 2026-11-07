import { useEffect, useState } from 'react';

/**
 * Live media-query match. Used to switch the orders list between the seven
 * column table and the compact cards, so only one of the two is ever rendered.
 */
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => (typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : false),
  );

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const list = window.matchMedia(query);
    const sync = () => setMatches(list.matches);
    sync();
    list.addEventListener('change', sync);
    return () => list.removeEventListener('change', sync);
  }, [query]);

  return matches;
}
