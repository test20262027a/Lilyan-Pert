import { useEffect, useState } from 'react';

/** Ticking clock isolated in its own component so it never rerenders a page. */
export default function LiveClock({ timeZone, className }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);
  const text = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timeZone || undefined,
  }).format(new Date());
  return <span className={className}>{text}</span>;
}
