import { useI18n } from '../../i18n';
import { SettingsCard } from './SettingsCard';
import MenuFeatureCards from './menu/MenuFeatureCards';
import TableModeCards from './menu/TableModeCards';
import LanguageManagementCard from './menu/LanguageManagementCard';
import { normalizeMenuSettings } from './menu/menuSettingsModel';

/*
 * Menu Settings — language management, the twelve general menu features, the
 * ordering & cart capabilities, and table identification.
 *
 * The tab edits the shared settings draft only; nothing is written until the
 * workspace's single Save runs, so switching tabs or languages never loses a
 * choice, and every value persists through the existing business endpoint.
 *
 * The feature list is intentionally fixed — the owner's exact order, never
 * sorted or regrouped — and every feature row carries two independent switches,
 * one per customer interface, so the main ordering menu and the QR table menu
 * can be configured differently.
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
    { key: 'search', icon: 'search', tone: '#4f7cf7', title: t('menu_feat_search'), hint: t('menu_feat_search_hint') },
    { key: 'status', icon: 'store', tone: '#12a67a', title: t('menu_feat_status'), hint: t('menu_feat_status_hint') },
    { key: 'hours', icon: 'clock', tone: '#1e9ecb', title: t('menu_feat_hours'), hint: t('menu_feat_hours_hint') },
    { key: 'ads', icon: 'megaphone', tone: '#e8557a', title: t('menu_feat_ads'), hint: t('menu_feat_ads_hint') },
    { key: 'featured', icon: 'star', tone: '#b45ef0', title: t('menu_feat_featured'), hint: t('menu_feat_featured_hint') },
    {
      key: 'best_selling',
      icon: 'trophy',
      tone: '#e0a92b',
      title: t('menu_feat_best'),
      hint: t('menu_feat_best_hint'),
      note: bestSellingEnabled ? null : t('menu_best_disabled_note'),
    },
    { key: 'categories', icon: 'grid', tone: '#6c63ff', title: t('menu_feat_categories'), hint: t('menu_feat_categories_hint') },
    { key: 'product_count', icon: 'layers', tone: '#0e9da4', title: t('menu_feat_count'), hint: t('menu_feat_count_hint') },
    { key: 'summary', icon: 'chart', tone: '#3f8ecf', title: t('menu_feat_summary'), hint: t('menu_feat_summary_hint') },
    { key: 'prices', icon: 'tag', tone: '#c2410c', title: t('menu_feat_prices'), hint: t('menu_feat_prices_hint') },
    { key: 'details', icon: 'eye', tone: '#7c5cd6', title: t('menu_feat_details'), hint: t('menu_feat_details_hint') },
    { key: 'about', icon: 'book', tone: '#b8722e', title: t('menu_feat_about'), hint: t('menu_feat_about_hint') },
    { key: 'social', icon: 'share', tone: '#e0559b', title: t('menu_feat_social'), hint: t('menu_feat_social_hint') },
  ];

  const orderRows = [
    { key: 'cart', icon: 'cart', tone: '#2f86e0', title: t('menu_ord_cart'), hint: t('menu_ord_cart_hint') },
    { key: 'checkout', icon: 'wallet', tone: '#12a67a', title: t('menu_ord_checkout'), hint: t('menu_ord_checkout_hint') },
    { key: 'order', icon: 'clipboard', tone: '#7c5cd6', title: t('menu_ord_order'), hint: t('menu_ord_order_hint') },
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
        <MenuFeatureCards
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
        <MenuFeatureCards
          rows={orderRows}
          value={menu.ordering}
          disabled={!canManage}
          footNote={orderBroken ? t('menu_order_dependency_hint') : null}
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
