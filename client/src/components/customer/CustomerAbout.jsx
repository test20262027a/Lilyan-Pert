import CustomerPanel from './CustomerPanel';
import { useI18n } from '../../i18n';

/* The owner's own words about the place, under the storefront header. Renders
   nothing when no description was saved, so the sections around it keep the
   space. */
export default function CustomerAbout({ text }) {
  const { t } = useI18n();
  if (!text) return null;

  return (
    <CustomerPanel icon="store" tone="sky" title={t('customer_menu_about')}>
      <p className="cui-about__text">{text}</p>
    </CustomerPanel>
  );
}
