import Icon from '../Icon';
import { useI18n } from '../../i18n';

/*
 * The single wide header card above the product grid: the selected category on
 * one side (icon container, bold name, supporting line) and the compact product
 * counters on the other. Every number comes from the caller's persisted records.
 */
export default function CategorySummary({ icon, toneClass, title, subtitle, stats }) {
  const { t } = useI18n();

  return (
    <header className="msummary">
      <div className="msummary__identity">
        <span className={`msummary__icon ${toneClass}`}>
          <Icon name={icon} size={20} />
        </span>
        <div className="msummary__text">
          <div className="msummary__title">{title}</div>
          <div className="msummary__sub">{subtitle}</div>
        </div>
      </div>

      <div className="msummary__stats">
        <span className="mpill mpill--total">
          <Icon name="layers" size={13} />
          <span className="mpill__num">{stats.total}</span>
          {t('menu_total_products')}
        </span>
        <span className="mpill mpill--active">
          <Icon name="checkCircle" size={13} />
          <span className="mpill__num">{stats.active}</span>
          {t('menu_active_products')}
        </span>
        <span className="mpill mpill--inactive">
          <Icon name="xCircle" size={13} />
          <span className="mpill__num">{stats.inactive}</span>
          {t('menu_inactive_products')}
        </span>
      </div>
    </header>
  );
}
