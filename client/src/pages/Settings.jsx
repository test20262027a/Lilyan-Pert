import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { Alert, Loading, useToast } from '../components/ui';
import { useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import PageHeroBanner from '../components/menu/PageHeroBanner';
import SettingsArtwork from '../components/settings/SettingsArtwork';
import MenuSettingsArtwork from '../components/settings/menu/MenuSettingsArtwork';
import SettingsTabs from '../components/settings/SettingsTabs';
import LogoCoverTab from '../components/settings/LogoCoverTab';
import BusinessInfoTab from '../components/settings/BusinessInfoTab';
import ContactTab from '../components/settings/ContactTab';
import SocialTab from '../components/settings/SocialTab';
import HoursTab from '../components/settings/HoursTab';
import DashboardTab from '../components/settings/DashboardTab';
import BestSellingTab from '../components/settings/BestSellingTab';
import MenuSettingsTab from '../components/settings/MenuSettingsTab';
import CustomerMenuTab from '../components/settings/CustomerMenuTab';
import ReceiptTab from '../components/settings/ReceiptTab';
import AppearanceTab from '../components/settings/AppearanceTab';
import { validateDraft } from '../components/settings/validate';
import '../menu.css';
import '../settings.css';
import '../settingsProfile.css';

/*
 * Business Settings — one workspace, ten tabs.
 *
 * Every tab edits the same draft object, so switching tabs never touches what
 * has already been typed and the single header Save persists all of it through
 * the existing business endpoint. Nothing is written until Save; nothing is
 * reset when a tab changes. The legacy sidebar entries (/menu-settings and
 * /text-editor) map onto the matching tab instead of duplicating a screen.
 */

/* `tone` gives every tab icon its own persistent colour identity; the hues are
   declared in settingsProfile.css so light/dark and all presets adapt. */
const TABS = [
  { value: 'branding', icon: 'image', tone: 'azure' },
  { value: 'business', icon: 'building', tone: 'teal' },
  { value: 'contact', icon: 'phone', tone: 'emerald' },
  { value: 'social', icon: 'share', tone: 'violet' },
  { value: 'hours', icon: 'clock', tone: 'amber' },
  { value: 'dashboard', icon: 'dashboard', tone: 'cyan' },
  { value: 'best', icon: 'trophy', tone: 'gold' },
  { value: 'menu', icon: 'sliders', tone: 'indigo' },
  { value: 'menutext', icon: 'type', tone: 'rose' },
  { value: 'receipt', icon: 'print', tone: 'copper' },
  { value: 'appearance', icon: 'palette', tone: 'fuchsia' },
];

const TAB_VALUES = TABS.map((tab) => tab.value);

/** A copy of the business with every nested settings object own-cloned. */
function draftFrom(business) {
  if (!business) return null;
  return {
    ...business,
    socials: { ...(business.socials || {}) },
    addresses: { ...(business.addresses || {}) },
    theme: { ...(business.theme || {}) },
    working_hours: { ...(business.working_hours || {}) },
    receipt_settings: { ...(business.receipt_settings || {}) },
    notification_settings: { ...(business.notification_settings || {}) },
    dashboard_settings: { ...(business.dashboard_settings || {}) },
    menu_settings: {
      ...(business.menu_settings || {}),
      best_selling: { ...(business.menu_settings?.best_selling || {}) },
    },
    editable_text: { ...(business.editable_text || {}) },
  };
}

export default function Settings({ initialTab }) {
  const { t } = useI18n();
  const { business, save } = useBusiness();
  const { isManager } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const baseline = useMemo(() => draftFrom(business), [business]);
  const [draft, setDraft] = useState(() => draftFrom(business));
  const [busy, setBusy] = useState(false);

  // A saved record or a reloaded business refreshes the baseline (and the
  // draft) — never a tab switch.
  useEffect(() => {
    setDraft(draftFrom(business));
  }, [business]);

  const fromUrl = params.get('tab');
  const [tab, setTab] = useState(() =>
    TAB_VALUES.includes(fromUrl) ? fromUrl : TAB_VALUES.includes(initialTab) ? initialTab : 'branding',
  );

  const selectTab = (value) => {
    setTab(value);
    const next = new URLSearchParams(params);
    next.set('tab', value);
    setParams(next, { replace: true });
  };

  /*
   * Keep the panel in step with the address: a `?tab=` link (a sidebar entry or
   * the browser's back button) must open that tab even when this component is
   * already mounted, without remounting and losing the draft.
   */
  useEffect(() => {
    const fromUrl = params.get('tab');
    if (fromUrl && TAB_VALUES.includes(fromUrl) && fromUrl !== tab) setTab(fromUrl);
  }, [params, tab]);

  // The legacy routes pass the tab as a prop instead of a query parameter.
  useEffect(() => {
    if (TAB_VALUES.includes(initialTab)) setTab(initialTab);
  }, [initialTab]);

  const dirty = useMemo(
    () => Boolean(draft && baseline) && JSON.stringify(draft) !== JSON.stringify(baseline),
    [draft, baseline],
  );

  // Leaves the browser's own warning in place of silently dropping edits.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (!draft) return <Loading />;

  const setField = (key) => (event) => setDraft((d) => ({ ...d, [key]: event.target.value }));
  const setVal = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const setJson = (key, field, value) =>
    setDraft((d) => ({ ...d, [key]: { ...(d[key] || {}), [field]: value } }));
  const patch = (key, partial) => setDraft((d) => ({ ...d, [key]: { ...(d[key] || {}), ...partial } }));
  const setEditable = (field, code, value) =>
    setDraft((d) => ({
      ...d,
      editable_text: {
        ...(d.editable_text || {}),
        [field]: { ...(d.editable_text?.[field] || {}), [code]: value },
      },
    }));

  const saveAll = async () => {
    if (busy || !isManager) return;
    const problem = validateDraft(draft, t);
    if (problem) {
      selectTab(problem.tab);
      toast.error(problem.message);
      return;
    }
    setBusy(true);
    try {
      await save({
        // The fallback display name follows the primary translation so every
        // consumer that reads `name` shows the name the user actually saved.
        name:
          draft.name_en || draft.name_ku || draft.name_fa || draft.name_ar || draft.name || '',
        name_ku: draft.name_ku || '',
        name_fa: draft.name_fa || '',
        name_ar: draft.name_ar || '',
        name_en: draft.name_en || '',
        description: draft.description || '',
        logo_url: draft.logo_url || null,
        cover_url: draft.cover_url || null,
        phone: draft.phone || '',
        email: draft.email || '',
        website: draft.website || '',
        // The legacy single address mirrors the English one receipts fall back to.
        address: (draft.addresses?.en || '').trim() || draft.address || '',
        addresses: draft.addresses,
        city: draft.city || '',
        latitude: draft.latitude === '' || draft.latitude == null ? null : Number(draft.latitude),
        longitude: draft.longitude === '' || draft.longitude == null ? null : Number(draft.longitude),
        business_type: draft.business_type || 'cafe',
        currency: draft.currency || '',
        timezone: draft.timezone || 'UTC',
        tax_rate: Number(draft.tax_rate) || 0,
        service_charge_rate: Number(draft.service_charge_rate) || 0,
        socials: draft.socials,
        theme: draft.theme,
        working_hours: draft.working_hours,
        receipt_settings: draft.receipt_settings,
        notification_settings: draft.notification_settings,
        dashboard_settings: draft.dashboard_settings,
        menu_settings: draft.menu_settings,
        editable_text: draft.editable_text,
      });
      toast.success(t('state_saved'));
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const shared = { draft, setField, setVal, setJson, patch, setEditable, canManage: isManager };

  const panel = () => {
    switch (tab) {
      case 'business':
        return <BusinessInfoTab {...shared} />;
      case 'contact':
        return <ContactTab {...shared} />;
      case 'social':
        return <SocialTab {...shared} />;
      case 'hours':
        return <HoursTab {...shared} />;
      case 'dashboard':
        return <DashboardTab {...shared} />;
      case 'best':
        return <BestSellingTab {...shared} />;
      case 'menu':
        return <MenuSettingsTab {...shared} />;
      case 'menutext':
        return <CustomerMenuTab {...shared} />;
      case 'receipt':
        return <ReceiptTab {...shared} />;
      case 'appearance':
        return <AppearanceTab {...shared} />;
      default:
        return <LogoCoverTab {...shared} />;
    }
  };

  /*
   * The Menu Settings tab keeps the workspace's single hero and single Save —
   * it only switches the banner's identity and artwork to the menu one, so no
   * second top-level banner or Save button ever appears on the page.
   */
  const isMenuSection = tab === 'menu';

  return (
    <div className="set-page">
      <div className={`set-hero ${isMenuSection ? 'is-menu' : ''}`}>
        <PageHeroBanner
          icon={isMenuSection ? 'sliders' : 'settings'}
          title={isMenuSection ? t('menu_settings_title') : t('settings_title')}
          subtitle={isMenuSection ? t('menu_settings_subtitle') : t('settings_subtitle')}
          art={isMenuSection ? <MenuSettingsArtwork /> : <SettingsArtwork />}
        >
          {dirty ? (
            <span className="set-hero__unsaved" title={t('settings_unsaved_hint')}>
              <Icon name="alert" size={12} />
              {t('settings_unsaved')}
            </span>
          ) : null}
          <button
            type="button"
            className="set-save"
            onClick={saveAll}
            disabled={!isManager || busy || !dirty}
            title={dirty ? t('settings_unsaved_hint') : t('action_save')}
          >
            {busy ? <span className="spinner" /> : <Icon name="check" size={15} />}
            {t('action_save')}
          </button>
        </PageHeroBanner>
      </div>

      {!isManager ? <Alert kind="warning">{t('user_view_only')}</Alert> : null}

      <SettingsTabs
        value={tab}
        onChange={selectTab}
        tabs={TABS.map((item) => ({
          value: item.value,
          icon: item.icon,
          tone: item.tone,
          label: t(`settings_tab_${item.value}`),
        }))}
      />

      <div className="set-panel" role="tabpanel" id={`settings-panel-${tab}`} aria-labelledby={`settings-tab-${tab}`}>
        {panel()}
      </div>
    </div>
  );
}
