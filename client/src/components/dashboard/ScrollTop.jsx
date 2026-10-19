import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';

/**
 * Floating back-to-top control. It appears only once the page is scrolled and
 * scrolls the page's own vertical scroller — no nested scroll container, so it
 * keeps working on mobile and desktop.
 */
export default function ScrollTop() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="scroll-top no-print"
      aria-label={t('dash_scroll_top')}
      title={t('dash_scroll_top')}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <Icon name="chevronsUp" size={18} />
    </button>
  );
}
