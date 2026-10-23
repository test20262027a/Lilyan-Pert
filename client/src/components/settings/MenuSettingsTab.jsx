import { useI18n } from '../../i18n';
import { SettingsCard } from './SettingsCard';
import MenuFeatureMatrix from './menu/MenuFeatureMatrix';
import TableModeCards from './menu/TableModeCards';
import LanguageManagementCard from './menu/LanguageManagementCard';
import { normalizeMenuSettings } from './menu/menuSettingsModel';

/*
 * Menu Settings — the three cards of the reference: general menu features, the
 * ordering & cart capabilities, and table identification.
 *
 * The tab edits the shared settings draft only; nothing is written until the
 * workspace's single Save runs, so switching tabs or languages never loses a
 * choice, and all 23 values persist through the existing business endpoint.
 * Every switch is independent: turning a feature off for the main menu never
 * changes the customer QR menu.
 */
export default function MenuSettingsTab({ draft, patch, canManage }) {
  const { t } = useI18n();
  const menu = normalizeMenuSettings(draft.menu_settings);
  const bestSellingEnabled = menu.best_selling?.enabled === true;

  const setSwitch = (group, key, side, next) =>
    patch('menu_settings', {
      [group]: {
        ...menu[group],
        [key]: { ...menu[group][key], [side]: next },
      },
    });

  const featureRows = [
    {
      key: 'search',
      title: t('menu_feat_search'),
      hint: t('menu_feat_search_hint'),
    },
    {
      key: 'categories',
      title: t('menu_feat_categories'),
      hint: t('menu_feat_categories_hint'),
    },
    {
      key: 'ads',
      title: t('menu_feat_ads'),
      hint: t('menu_feat_ads_hint'),
    },
    {
      key: 'featured',
      title: t('menu_feat_featured'),
      hint: t('menu_feat_featured_hint'),
    },
    {
      key: 'best_selling',
      title: t('menu_feat_best'),
      hint: t('menu_feat_best_hint'),
      note: bestSellingEnabled ? null : t('menu_best_disabled_note'),
    },
    {
      key: 'social',
      title: t('menu_feat_social'),
      hint: t('menu_feat_social_hint'),
    },
    {
      key: 'prices',
      title: t('menu_feat_prices'),
      hint: t('menu_feat_prices_hint'),
    },
    {
      key: 'details',
      title: t('menu_feat_details'),
      hint: t('menu_feat_details_hint'),
    },
  ];

  const orderRows = [
    { key: 'cart', title: t('menu_ord_cart'), hint: t('menu_ord_cart_hint') },
    { key: 'checkout', title: t('menu_ord_checkout'), hint: t('menu_ord_checkout_hint') },
    { key: 'order', title: t('menu_ord_order'), hint: t('menu_ord_order_hint') },
  ];

  const orderBroken = ['main', 'qr'].some(
    (side) =>
      menu.ordering.cart[side] === false &&
      (menu.ordering.checkout[side] !== false || menu.ordering.order[side] !== false),
  );

  return (
    <>
      <LanguageManagementCard
        value={menu.language_settings}
        disabled={!canManage}
        onChange={(next) => patch('menu_settings', { language_settings: next })}
      />

      <SettingsCard
        icon="eye"
        tone="green"
        title={t('menu_features_title')}
        subtitle={t('menu_features_subtitle')}
      >
        <MenuFeatureMatrix
          rows={featureRows}
          value={menu.features}
          disabled={!canManage}
          onChange={(key, side, next) => setSwitch('features', key, side, next)}
        />
      </SettingsCard>

      <SettingsCard
        icon="cart"
        tone="green"
        title={t('menu_ordering_title')}
        subtitle={t('menu_ordering_subtitle')}
      >
        <MenuFeatureMatrix
          rows={orderRows}
          value={menu.ordering}
          disabled={!canManage}
          note={orderBroken ? t('menu_order_dependency_hint') : null}
          onChange={(key, side, next) => setSwitch('ordering', key, side, next)}
        />
      </SettingsCard>

      <SettingsCard
        icon="qr"
        tone="green"
        title={t('menu_table_title')}
        subtitle={t('menu_table_subtitle')}
      >
        <TableModeCards
          value={menu.table_mode}
          disabled={!canManage}
          onChange={(next) => patch('menu_settings', { table_mode: next })}
        />
      </SettingsCard>
    </>
  );
}
