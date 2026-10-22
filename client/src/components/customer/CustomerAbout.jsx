import Icon from '../Icon';
import { useI18n } from '../../i18n';

/* The owner's own words about the place, on a soft card. Renders nothing when
   no description was saved, so the sections around it keep the space. */
export default function CustomerAbout({ text }) {
  const { t } = useI18n();
  if (!text) return null;

  return (
    <section className="cui-block">
      <header className="cui-block__head">
        <span className="cui-block__icon">
          <Icon name="info" size={16} />
        </span>
        <h2>{t('customer_menu_about')}</h2>
      </header>
      <p className="cui-about__text">{text}</p>
    </section>
  );
}
