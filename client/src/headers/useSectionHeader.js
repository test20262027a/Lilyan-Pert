import { useLocation } from 'react-router-dom';
import { sectionForPath, sectionHeader } from './headerConfig';

/** Resolves the header identity: an explicit section wins, else the route decides. */
export function useSectionHeader(section) {
  const { pathname } = useLocation();
  return sectionHeader(section || sectionForPath(pathname));
}
