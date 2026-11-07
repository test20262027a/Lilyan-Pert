import Icon from '../Icon';
import { useI18n } from '../../i18n';

/*
 * The consequence block of the category delete dialog: what else leaves the
 * menu, and how many records in total.
 *
 * Every number comes from the server's own impact query — never from the
 * rendered list — so the dialog can only describe a deletion the backend would
 * actually perform. While that query is pending (or if it failed) nothing is
 * promised here, and the dialog keeps its destructive button disabled.
 */
export default function CategoryDeleteDetails({ impact, error }) {
  const { t } = useI18n();

  if (error) {
    return (
      <p className="dcd__warn dcd__warn--amber">
        <Icon name="alert" size={14} />
        <span>{t('menu_delete_impact_error')}</span>
      </p>
    );
  }

  if (!impact) return null;

  const count = impact.product_count;
  const promotions = Number(impact.promotion_count) || 0;

  return (
    <>
      {count > 0 ? (
        <p className="dcd__warn dcd__warn--amber">
          <Icon name="alert" size={14} />
          <span>
            {t('menu_delete_category_warning', { count })}
            <br />
            {t('menu_delete_irreversible')}
            {promotions > 0 ? ` ${t('menu_delete_category_promotions', { count: promotions })}` : ''}
          </span>
        </p>
      ) : (
        <p className="dcd__warn">
          <Icon name="check" size={14} />
          <span>{t('menu_delete_category_empty_note')}</span>
        </p>
      )}

      <div className="dcd__impact">
        <div className="dcd__impact-row">
          <span>{t('menu_delete_impact_products')}</span>
          <strong>{count}</strong>
        </div>
        <div className="dcd__impact-row dcd__impact-row--total">
          <span>{t('menu_delete_impact_total')}</span>
          <strong>{impact.total}</strong>
        </div>
      </div>
    </>
  );
}
