import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { fmtClock } from '../format';

/** Ticking clock isolated in its own component so it never rerenders a page. */
export default function LiveClock({ timeZone, className }) {
  const { locale } = useI18n();
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);
  return <span className={className}>{fmtClock(new Date(), locale, timeZone)}</span>;
}
