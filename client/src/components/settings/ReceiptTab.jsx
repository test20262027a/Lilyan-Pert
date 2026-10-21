import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { ConfirmDialog, useToast } from '../ui';
import { useI18n } from '../../i18n';
import { PrintPortal, ReceiptPaper, ReceiptPrintStyle } from '../Receipt';
import { ChoiceCard, SettingsCard, SettingsToggleRow } from './SettingsCard';
import { SetField } from './fields';

/* Paper widths offered by the reference, plus a free width printers accept. */
const WIDTHS = [
  { value: '80mm', label: '80mm' },
  { value: '58mm', label: '58mm' },
  { value: 'custom', labelKey: 'settings_receipt_custom' },
];
const LOGO_SIZES = ['small', 'medium', 'large'];
const ALIGNMENTS = ['auto', 'center', 'start'];

/* Restores receipt presentation only — business data and orders are untouched. */
const RECEIPT_DEFAULTS = {
  show_logo: true,
  show_address: true,
  show_phone: true,
  show_order_info: true,
  show_change_info: true,
  show_cashier: true,
  show_more_info: true,
  show_order_number: true,
  show_datetime: true,
  show_customer_name: true,
  show_table_number: true,
  show_notes: true,
  paper_width: '80mm',
  custom_width: 80,
  print_scale: 100,
  margin_left: 0,
  margin_right: 0,
  margin_bottom: 0,
  logo_size: 'medium',
  alignment: 'auto',
};

/** Sample receipt for the preview and Test print — no order is ever created. */
function sampleReceipt(draft, t) {
  return {
    order: {
      order_number: 1024,
      created_at: new Date().toISOString(),
      customer_name: t('settings_receipt_sample_customer'),
      subtotal: 12000,
      discount: 0,
      tax: 0,
      service_charge: 0,
      total: 12000,
      notes: null,
    },
    items: [{ name: t('settings_receipt_sample_item'), quantity: 1, line_total: 12000, notes: null }],
    table: { name: 'A1' },
    business: {
      name_en: draft.name_en,
      name_ku: draft.name_ku,
      name_fa: draft.name_fa,
      name_ar: draft.name_ar,
      name: draft.name,
      logo_url: draft.logo_url,
      phone: draft.phone,
      address: draft.address,
      addresses: draft.addresses,
      city: draft.city,
      currency: draft.currency,
      timezone: draft.timezone,
      receipt_settings: draft.receipt_settings,
      editable_text: draft.editable_text,
    },
  };
}

export default function ReceiptTab({ draft, setJson, patch, canManage }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [printing, setPrinting] = useState(false);
  const receipt = draft.receipt_settings || {};
  const width = receipt.paper_width || '80mm';
  const data = sampleReceipt(draft, t);

  useEffect(() => {
    if (!printing) return undefined;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    const id = setTimeout(() => window.print(), 120);
    return () => {
      window.removeEventListener('afterprint', done);
      clearTimeout(id);
    };
  }, [printing]);

  const numeric = (key, fallback, min, max) => ({
    className: 'input',
    type: 'number',
    dir: 'ltr',
    min,
    max,
    step: '1',
    disabled: !canManage,
    value: receipt[key] ?? fallback,
    onChange: (event) =>
      setJson('receipt_settings', key, event.target.value === '' ? '' : Number(event.target.value)),
  });

  const setChoice = (key, value) => canManage && setJson('receipt_settings', key, value);

  return (
    <>
      <SettingsCard
        icon="print"
        tone="teal"
        title={t('settings_receipt_title')}
        subtitle={t('settings_receipt_subtitle')}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setConfirmReset(true)} disabled={!canManage}>
              <Icon name="refresh" size={15} />
              {t('settings_restore_defaults')}
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setPrinting(true)} disabled={!canManage}>
              <Icon name="print" size={15} />
              {t('settings_test_print')}
            </button>
          </>
        }
      >
        <SetField label={t('settings_receipt_width')}>
          <div className="set-choices">
            {WIDTHS.map((option) => (
              <ChoiceCard
                key={option.value}
                active={width === option.value}
                onClick={() => setChoice('paper_width', option.value)}
              >
                {option.labelKey ? t(option.labelKey) : option.label}
              </ChoiceCard>
            ))}
          </div>
        </SetField>

        {width === 'custom' ? (
          <div style={{ marginTop: 14, maxWidth: 260 }}>
            <SetField label={t('settings_receipt_custom_width')} hint={t('settings_receipt_custom_hint')}>
              <input {...numeric('custom_width', 80, 40, 120)} />
            </SetField>
          </div>
        ) : null}

        <hr className="set-divider" style={{ margin: '16px 0' }} />

        <div className="set-receipt">
          <div>
            <div className="set-group-label">{t('settings_receipt_calibration')}</div>
            <div className="set-grid">
              <SetField label={t('settings_receipt_scale')} hint={t('settings_receipt_scale_hint')}>
                <input {...numeric('print_scale', 100, 50, 150)} />
              </SetField>
              <SetField label={t('settings_receipt_margin_left')} hint={t('settings_receipt_margin_hint')}>
                <input {...numeric('margin_left', 0, 0, 20)} />
              </SetField>
              <SetField label={t('settings_receipt_margin_right')} hint={t('settings_receipt_margin_hint')}>
                <input {...numeric('margin_right', 0, 0, 20)} />
              </SetField>
              <SetField label={t('settings_receipt_margin_bottom')} hint={t('settings_receipt_margin_hint')}>
                <input {...numeric('margin_bottom', 0, 0, 20)} />
              </SetField>
            </div>
            <p className="set-hint">{t('settings_receipt_calibration_hint')}</p>
          </div>

          <div>
            <div className="set-group-label">{t('settings_receipt_preview')}</div>
            <div className="set-preview">
              <div className="set-preview__paper">
                {/* The same renderer the printed receipt uses, so the preview
                    follows every toggle below it. */}
                <ReceiptPaper data={data} locale={locale} t={t} showChangeInfo />
              </div>
            </div>
            <p className="set-preview__note">{t('settings_receipt_preview_hint')}</p>
          </div>
        </div>

        <hr className="set-divider" style={{ margin: '16px 0' }} />

        <SettingsToggleRow
          title={t('settings_show_logo')}
          checked={receipt.show_logo !== false}
          disabled={!canManage}
          onChange={(value) => setJson('receipt_settings', 'show_logo', value)}
        />

        <div style={{ marginTop: 14 }}>
          <div className="set-group-label">{t('settings_receipt_logo_size')}</div>
          <div className="set-choices">
            {LOGO_SIZES.map((value) => (
              <ChoiceCard
                key={value}
                active={(receipt.logo_size || 'medium') === value}
                onClick={() => setChoice('logo_size', value)}
              >
                {t(`settings_receipt_size_${value}`)}
              </ChoiceCard>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="set-group-label">{t('settings_receipt_alignment')}</div>
          <div className="set-choices">
            {ALIGNMENTS.map((value) => (
              <ChoiceCard
                key={value}
                active={(receipt.alignment || 'auto') === value}
                onClick={() => setChoice('alignment', value)}
              >
                {t(`settings_receipt_align_${value}`)}
              </ChoiceCard>
            ))}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard icon="receipt" tone="blue" title={t('settings_receipt_order_info')}>
        <SettingsToggleRow
          title={t('settings_show_order_info')}
          checked={receipt.show_order_info !== false}
          disabled={!canManage}
          onChange={(value) => setJson('receipt_settings', 'show_order_info', value)}
        />
        {[
          ['show_order_number', 'settings_show_order_number'],
          ['show_datetime', 'settings_show_datetime'],
          ['show_customer_name', 'settings_show_customer_name'],
          ['show_table_number', 'settings_show_table_number'],
          ['show_notes', 'settings_show_notes'],
          ['show_more_info', 'settings_show_more_info'],
        ].map(([key, label]) => (
          <SettingsToggleRow
            key={key}
            title={t(label)}
            checked={receipt[key] !== false}
            disabled={!canManage || receipt.show_order_info === false}
            onChange={(value) => setJson('receipt_settings', key, value)}
          />
        ))}

        {/* Header/footer content that already exists on this business record. */}
        <hr className="set-divider" style={{ margin: '12px 0 4px' }} />
        {[
          ['show_address', 'settings_show_address'],
          ['show_phone', 'settings_show_phone'],
          ['show_cashier', 'settings_show_cashier'],
          ['show_change_info', 'settings_show_change_info'],
        ].map(([key, label]) => (
          <SettingsToggleRow
            key={key}
            title={t(label)}
            hint={key === 'show_change_info' ? t('settings_show_change_info_hint') : undefined}
            checked={receipt[key] !== false}
            disabled={!canManage}
            onChange={(value) => setJson('receipt_settings', key, value)}
          />
        ))}
        <div style={{ marginTop: 14 }}>
          <SetField label={t('settings_footer_text')}>
            <input
              className="input"
              value={receipt.footer_text || ''}
              disabled={!canManage}
              onChange={(event) => setJson('receipt_settings', 'footer_text', event.target.value)}
            />
          </SetField>
        </div>
      </SettingsCard>

      {confirmReset ? (
        <ConfirmDialog
          title={t('settings_restore_receipt_title')}
          message={t('settings_restore_receipt_message')}
          confirmLabel={t('settings_restore_defaults')}
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            // Only receipt presentation is reset; the footer text stays.
            patch('receipt_settings', { ...RECEIPT_DEFAULTS, footer_text: receipt.footer_text || '' });
            setConfirmReset(false);
            toast.success(t('settings_receipt_restored'));
          }}
        />
      ) : null}

      {printing ? (
        <PrintPortal>
          <ReceiptPrintStyle settings={receipt} />
          <ReceiptPaper data={data} locale={locale} t={t} showChangeInfo />
        </PrintPortal>
      ) : null}
    </>
  );
}
