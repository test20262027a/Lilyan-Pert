import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import {
  Alert,
  Field,
  Loading,
  SectionCard,
  Select,
  Switch,
  SwitchRow,
  Tabs,
  useToast,
} from '../components/ui';
import { useI18n, LOCALES } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { uploadImage } from '../api';
import { PRESETS, primaryFor } from '../theme';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const TABS = [
  { value: 'profile', icon: 'info' },
  { value: 'hours', icon: 'clock' },
  { value: 'receipt', icon: 'print' },
  { value: 'notifications', icon: 'bell' },
  { value: 'appearance', icon: 'palette' },
  { value: 'menu', icon: 'book' },
  { value: 'text', icon: 'pencil' },
];

function ImageField({ label, value, onChange }) {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {/* Complete image, real aspect ratio — the container adapts, not the image. */}
      {value ? (
        <div className="image-preview image-preview--contain">
          <img src={value} alt="" />
        </div>
      ) : null}
      <div className="btn-row">
        <label className="btn btn--sm" style={{ cursor: 'pointer' }}>
          {busy ? <span className="spinner" /> : <Icon name="upload" size={15} />}
          {t('action_upload')}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setBusy(true);
              try {
                onChange(await uploadImage(file));
              } catch {
                toast.error(t('error_invalid_image'));
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {value ? (
          <button className="btn btn--sm" onClick={() => onChange(null)}>
            <Icon name="trash" size={15} />
            {t('menu_remove_image')}
          </button>
        ) : null}
      </div>
      <span className="field__hint">{t('menu_image_hint')}</span>
    </div>
  );
}

export default function Settings() {
  const { t } = useI18n();
  const { business, save } = useBusiness();
  const { isManager } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('profile');
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (business) {
      setDraft({
        ...business,
        socials: { ...(business.socials || {}) },
        theme: { ...(business.theme || {}) },
        working_hours: { ...(business.working_hours || {}) },
        receipt_settings: { ...(business.receipt_settings || {}) },
        notification_settings: { ...(business.notification_settings || {}) },
        menu_settings: { ...(business.menu_settings || {}) },
        editable_text: { ...(business.editable_text || {}) },
      });
    }
  }, [business]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(business),
    [draft, business],
  );

  if (!draft) return <Loading />;

  const setField = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const setVal = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const setJson = (key, field, value) => setDraft((d) => ({ ...d, [key]: { ...d[key], [field]: value } }));

  const persist = async (body) => {
    setBusy(true);
    try {
      await save(body);
      toast.success(t('state_saved'));
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const saveAll = () =>
    persist({
      name: draft.name,
      name_ku: draft.name_ku,
      name_fa: draft.name_fa,
      name_ar: draft.name_ar,
      name_en: draft.name_en,
      description: draft.description,
      logo_url: draft.logo_url,
      cover_url: draft.cover_url,
      phone: draft.phone,
      email: draft.email,
      website: draft.website,
      address: draft.address,
      city: draft.city,
      latitude: draft.latitude === '' ? null : draft.latitude,
      longitude: draft.longitude === '' ? null : draft.longitude,
      business_type: draft.business_type,
      currency: draft.currency,
      timezone: draft.timezone,
      tax_rate: Number(draft.tax_rate) || 0,
      service_charge_rate: Number(draft.service_charge_rate) || 0,
      socials: draft.socials,
      theme: draft.theme,
      working_hours: draft.working_hours,
      receipt_settings: draft.receipt_settings,
      notification_settings: draft.notification_settings,
      menu_settings: draft.menu_settings,
      editable_text: draft.editable_text,
    });

  const customerMenuOn = draft.menu_settings.show_customer_menu !== false;

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1>{t('settings_title')}</h1>
          <p>{t('settings_subtitle')}</p>
        </div>
        <div className="page-head__actions">
          {dirty ? <span className="chip">{t('state_saving')}</span> : null}
          <button className="btn btn--primary" onClick={saveAll} disabled={!isManager || busy || !dirty}>
            {busy ? <span className="spinner" /> : <Icon name="check" size={16} />}
            {t('action_save')}
          </button>
        </div>
      </div>

      {!isManager ? <Alert kind="warning">{t('user_view_only')}</Alert> : null}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={TABS.map((x) => ({ value: x.value, label: t(`settings_tab_${x.value}`), icon: x.icon }))}
      />

      {tab === 'profile' ? (
        <div className="grid grid--2">
          {/* Green — general information */}
          <SectionCard icon="info" iconClass="ic-green" title={t('sec_general')}>
            <div className="form-grid">
              <Field label={t('label_business_name')}>
                <input className="input" value={draft.name || ''} onChange={setField('name')} disabled={!isManager} />
              </Field>
              <Field label={t('settings_currency')}>
                <input className="input" dir="ltr" value={draft.currency || ''} onChange={setField('currency')} disabled={!isManager} />
              </Field>
              <Field label={t('label_description')} className="span-2">
                <textarea className="textarea" value={draft.description || ''} onChange={setField('description')} disabled={!isManager} />
              </Field>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="field__label" style={{ marginBottom: 8 }}>{t('sec_names')}</div>
              {/* Side by side on desktop/tablet, stacked on mobile. */}
              <div className="form-grid">
                {LOCALES.map((l) => (
                  <Field key={l.code} label={l.label}>
                    <input
                      className="input"
                      dir={l.rtl ? 'rtl' : 'ltr'}
                      value={draft[`name_${l.code}`] || ''}
                      onChange={setField(`name_${l.code}`)}
                      disabled={!isManager}
                    />
                  </Field>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* Amber — logo & cover */}
          <SectionCard icon="image" iconClass="ic-amber" title={t('sec_media')}>
            <div className="form-grid">
              <ImageField label={t('settings_logo')} value={draft.logo_url} onChange={(v) => setVal('logo_url', v)} />
              <ImageField label={t('settings_cover')} value={draft.cover_url} onChange={(v) => setVal('cover_url', v)} />
            </div>
          </SectionCard>

          {/* Blue — contact */}
          <SectionCard icon="phone" iconClass="ic-blue" title={t('sec_contact')}>
            <div className="form-grid">
              <Field label={t('label_phone')}>
                <input className="input" dir="ltr" value={draft.phone || ''} onChange={setField('phone')} disabled={!isManager} />
              </Field>
              <Field label={t('label_email')}>
                <input className="input" dir="ltr" value={draft.email || ''} onChange={setField('email')} disabled={!isManager} />
              </Field>
              <Field label={t('label_website')}>
                <input className="input" dir="ltr" value={draft.website || ''} onChange={setField('website')} disabled={!isManager} />
              </Field>
            </div>
          </SectionCard>

          {/* Coral — location */}
          <SectionCard icon="pin" iconClass="ic-coral" title={t('sec_location')}>
            <div className="form-grid">
              <Field label={t('label_address')} className="span-2">
                <input className="input" value={draft.address || ''} onChange={setField('address')} disabled={!isManager} />
              </Field>
              <Field label={t('label_city')}>
                <input className="input" value={draft.city || ''} onChange={setField('city')} disabled={!isManager} />
              </Field>
              <Field label="Latitude">
                <input className="input" dir="ltr" value={draft.latitude ?? ''} onChange={setField('latitude')} disabled={!isManager} />
              </Field>
              <Field label="Longitude">
                <input className="input" dir="ltr" value={draft.longitude ?? ''} onChange={setField('longitude')} disabled={!isManager} />
              </Field>
            </div>
          </SectionCard>

          {/* Purple — social links */}
          <SectionCard icon="link" iconClass="ic-purple" title={t('sec_social')}>
            <div className="form-grid">
              {['instagram', 'facebook', 'tiktok', 'whatsapp', 'website'].map((network) => (
                <Field key={network} label={network}>
                  <input
                    className="input"
                    dir="ltr"
                    value={draft.socials?.[network] || ''}
                    onChange={(e) => setJson('socials', network, e.target.value)}
                    disabled={!isManager}
                  />
                </Field>
              ))}
            </div>
            {Object.values(draft.socials || {}).some(Boolean) ? (
              <div className="social-list" style={{ marginTop: 14 }}>
                {Object.entries(draft.socials)
                  .filter(([, url]) => url)
                  .map(([network, url]) => (
                    <a key={network} className={`social-link social-link--${network}`} href={url} target="_blank" rel="noreferrer" aria-label={network}>
                      <Icon name={network === 'website' ? 'globe' : 'link'} size={17} />
                    </a>
                  ))}
              </div>
            ) : null}
          </SectionCard>

          {/* Teal — business type */}
          <SectionCard icon="coffee" iconClass="ic-teal" title={t('sec_type')}>
            <div className="form-grid">
              <Field label={t('settings_business_type')}>
                <Select
                  value={draft.business_type || 'cafe'}
                  onChange={(v) => setVal('business_type', v)}
                  disabled={!isManager}
                  options={[
                    { value: 'cafe', label: 'Café' },
                    { value: 'restaurant', label: 'Restaurant' },
                    { value: 'fast_food', label: 'Fast food' },
                    { value: 'bakery', label: 'Bakery' },
                    { value: 'juice_bar', label: 'Juice bar' },
                  ]}
                />
              </Field>
            </div>
          </SectionCard>

          {/* Indigo — settings */}
          <SectionCard icon="settings" iconClass="ic-indigo" title={t('sec_settings')}>
            <div className="form-grid">
              <Field label={t('settings_timezone')}>
                <Select
                  value={draft.timezone || 'Asia/Baghdad'}
                  onChange={(v) => setVal('timezone', v)}
                  disabled={!isManager}
                  options={[
                    { value: 'Asia/Baghdad', label: 'Asia/Baghdad' },
                    { value: 'Asia/Tehran', label: 'Asia/Tehran' },
                    { value: 'Asia/Dubai', label: 'Asia/Dubai' },
                    { value: 'Europe/London', label: 'Europe/London' },
                    { value: 'UTC', label: 'UTC' },
                  ]}
                />
              </Field>
              <Field label={t('settings_tax_rate')}>
                <input className="input" type="number" min="0" step="0.5" value={draft.tax_rate ?? 0} onChange={setField('tax_rate')} disabled={!isManager} />
              </Field>
              <Field label={t('settings_service_charge_rate')}>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={draft.service_charge_rate ?? 0}
                  onChange={setField('service_charge_rate')}
                  disabled={!isManager}
                />
              </Field>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === 'hours' ? (
        <SectionCard icon="clock" iconClass="ic-amber" title={t('sec_hours')}>
          <div className="hours-grid">
            {DAYS.map((day) => {
              const value = draft.working_hours[day] || { open: '09:00', close: '23:00', closed: false };
              return (
                <div className="hours-grid__row" key={day}>
                  <span className="hours-row__day">{t(`settings_day_${day}`)}</span>
                  <Switch
                    checked={!value.closed}
                    onChange={(v) => setJson('working_hours', day, { ...value, closed: !v })}
                    disabled={!isManager}
                    ariaLabel={`${t(`settings_day_${day}`)} ${t('settings_open_control')}`}
                  />
                  <div className="hours-row__times">
                    <input
                      type="time"
                      value={value.open || '09:00'}
                      disabled={!isManager || value.closed}
                      aria-label={`${t(`settings_day_${day}`)} ${t('settings_hours_open')}`}
                      onChange={(e) => setJson('working_hours', day, { ...value, open: e.target.value })}
                    />
                    <input
                      type="time"
                      value={value.close || '23:00'}
                      disabled={!isManager || value.closed}
                      aria-label={`${t(`settings_day_${day}`)} ${t('settings_hours_close')}`}
                      onChange={(e) => setJson('working_hours', day, { ...value, close: e.target.value })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      {tab === 'receipt' ? (
        <div className="grid grid--2">
          <SectionCard icon="print" iconClass="ic-amber" title={t('sec_receipt')}>
            <SwitchRow
              title={t('settings_show_logo')}
              checked={draft.receipt_settings.show_logo !== false}
              onChange={(v) => setJson('receipt_settings', 'show_logo', v)}
            />
            <SwitchRow
              title={t('settings_show_address')}
              checked={draft.receipt_settings.show_address !== false}
              onChange={(v) => setJson('receipt_settings', 'show_address', v)}
            />
            <SwitchRow
              title={t('settings_show_phone')}
              checked={draft.receipt_settings.show_phone !== false}
              onChange={(v) => setJson('receipt_settings', 'show_phone', v)}
            />
            <SwitchRow
              title={t('settings_show_cashier')}
              checked={draft.receipt_settings.show_cashier !== false}
              onChange={(v) => setJson('receipt_settings', 'show_cashier', v)}
            />
          </SectionCard>

          <SectionCard icon="receipt" iconClass="ic-blue" title={t('sec_receipt_order_info')}>
            <SwitchRow
              title={t('settings_show_order_info')}
              checked={draft.receipt_settings.show_order_info !== false}
              onChange={(v) => setJson('receipt_settings', 'show_order_info', v)}
            />
            {/*
              "Show Receipt Change Information" — deliberately no icon beside the
              label. Hides the audit on the printed receipt only; the order
              details form keeps showing it and nothing stops being recorded.
            */}
            <SwitchRow
              title={t('settings_show_change_info')}
              hint={t('settings_show_change_info_hint')}
              checked={draft.receipt_settings.show_change_info !== false}
              onChange={(v) => setJson('receipt_settings', 'show_change_info', v)}
            />
            <div className="form-grid" style={{ marginTop: 12 }}>
              <Field label={t('settings_paper_width')}>
                <Select
                  value={draft.receipt_settings.paper_width || '80mm'}
                  onChange={(v) => setJson('receipt_settings', 'paper_width', v)}
                  options={[
                    { value: '58mm', label: '58mm' },
                    { value: '80mm', label: '80mm' },
                  ]}
                />
              </Field>
              <Field label={t('settings_footer_text')} className="span-2">
                <input
                  className="input"
                  value={draft.receipt_settings.footer_text || ''}
                  onChange={(e) => setJson('receipt_settings', 'footer_text', e.target.value)}
                />
              </Field>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === 'notifications' ? (
        <SectionCard icon="bell" iconClass="ic-blue" title={t('sec_notifications')}>
          <SwitchRow
            title={t('settings_sound_enabled')}
            checked={draft.notification_settings.sound_enabled !== false}
            onChange={(v) => setJson('notification_settings', 'sound_enabled', v)}
          />
          <SwitchRow
            title={t('settings_new_order_alerts')}
            hint={t('dash_new_orders_only')}
            checked={draft.notification_settings.new_order !== false}
            onChange={(v) => setJson('notification_settings', 'new_order', v)}
          />
          <SwitchRow
            title={t('settings_status_alerts')}
            checked={Boolean(draft.notification_settings.status_changes)}
            onChange={(v) => setJson('notification_settings', 'status_changes', v)}
          />
          <SwitchRow
            title={t('settings_daily_summary')}
            checked={Boolean(draft.notification_settings.daily_summary)}
            onChange={(v) => setJson('notification_settings', 'daily_summary', v)}
          />
        </SectionCard>
      ) : null}

      {tab === 'appearance' ? (
        <SectionCard icon="palette" iconClass="ic-purple" title={t('sec_appearance')}>
          <div className="form-grid">
            <Field label={t('theme_mode')}>
              <Select
                value={draft.theme.mode === 'dark' ? 'dark' : 'light'}
                onChange={(v) => setJson('theme', 'mode', v)}
                options={[
                  { value: 'light', label: t('theme_light') },
                  { value: 'dark', label: t('theme_dark') },
                ]}
              />
            </Field>
            <Field label={t('theme_preset')}>
              <Select
                value={draft.theme.preset || 'midnight'}
                onChange={(v) => setDraft((d) => ({ ...d, theme: { ...d.theme, preset: v, primary: PRESETS[v]?.primary } }))}
                options={Object.entries(PRESETS).map(([key, v]) => ({ value: key, label: v.label }))}
              />
            </Field>
            <Field label={t('theme_primary_color')} hint={primaryFor(draft.theme)}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="color"
                  value={primaryFor(draft.theme)}
                  onChange={(e) => setJson('theme', 'primary', e.target.value)}
                  style={{ width: 54, height: 42, border: 'none', background: 'none' }}
                  aria-label={t('theme_primary_color')}
                />
                <input
                  className="input"
                  dir="ltr"
                  value={draft.theme.primary || ''}
                  onChange={(e) => setJson('theme', 'primary', e.target.value)}
                />
              </div>
            </Field>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(PRESETS).map(([key, v]) => (
              <button
                key={key}
                className="btn btn--sm"
                onClick={() => setDraft((d) => ({ ...d, theme: { ...d.theme, preset: key, primary: v.primary } }))}
                aria-label={v.label}
              >
                <span style={{ width: 14, height: 14, borderRadius: 4, background: v.primary, display: 'inline-block' }} />
                {v.label}
              </button>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {tab === 'menu' ? (
        <SectionCard icon="book" iconClass="ic-teal" title={t('sec_customer_menu')}>
          {/* Customer-menu visibility comes first, then the admin-return setting. */}
          <SwitchRow
            title={t('settings_show_customer_menu')}
            hint={t('settings_customer_menu_hint')}
            checked={customerMenuOn}
            onChange={(v) =>
              setDraft((d) => ({
                ...d,
                menu_settings: {
                  ...d.menu_settings,
                  show_customer_menu: v,
                  // Turning the customer menu off automatically turns the
                  // admin-return control off as well.
                  show_admin_return: v ? d.menu_settings.show_admin_return !== false : false,
                },
              }))
            }
          />
          <SwitchRow
            title={t('settings_show_admin_return')}
            hint={t('settings_admin_return_hint')}
            checked={draft.menu_settings.show_admin_return !== false}
            disabled={!customerMenuOn}
            onChange={(v) => setJson('menu_settings', 'show_admin_return', v)}
          />
          <SwitchRow
            title={t('settings_show_prices')}
            checked={draft.menu_settings.show_prices !== false}
            onChange={(v) => setJson('menu_settings', 'show_prices', v)}
          />
          <SwitchRow
            title={t('settings_show_images')}
            checked={draft.menu_settings.show_images !== false}
            onChange={(v) => setJson('menu_settings', 'show_images', v)}
          />
        </SectionCard>
      ) : null}

      {tab === 'text' ? (
        <SectionCard icon="pencil" iconClass="ic-pink" title={t('sec_editable_text')}>
          <div className="field__label" style={{ marginBottom: 8 }}>{t('settings_editable_menu_title')}</div>
          <div className="form-grid">
            {LOCALES.map((l) => (
              <Field key={l.code} label={l.label}>
                <input
                  className="input"
                  dir={l.rtl ? 'rtl' : 'ltr'}
                  value={draft.editable_text?.menu_title?.[l.code] || ''}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      editable_text: {
                        ...d.editable_text,
                        menu_title: { ...(d.editable_text?.menu_title || {}), [l.code]: e.target.value },
                      },
                    }))
                  }
                />
              </Field>
            ))}
          </div>

          <div className="field__label" style={{ margin: '18px 0 8px' }}>{t('settings_editable_welcome')}</div>
          <div className="form-grid">
            {LOCALES.map((l) => (
              <Field key={l.code} label={l.label}>
                <textarea
                  className="textarea"
                  dir={l.rtl ? 'rtl' : 'ltr'}
                  value={draft.editable_text?.welcome?.[l.code] || ''}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      editable_text: {
                        ...d.editable_text,
                        welcome: { ...(d.editable_text?.welcome || {}), [l.code]: e.target.value },
                      },
                    }))
                  }
                />
              </Field>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </>
  );
}
