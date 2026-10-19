import { useState } from 'react';
import Icon from '../Icon';
import { Alert, Field, Modal, Select, Switch } from '../ui';
import { useI18n, LOCALES } from '../../i18n';
import { catalogErrorText } from './errorText';

/* The category icons the app already offers — unchanged by this screen. */
const ICON_OPTIONS = [
  'coffee', 'utensils', 'book', 'tag', 'chart', 'sparkles', 'cart', 'star', 'table', 'layers',
];

/*
 * Create / edit category. The active state is edited here and only here — the
 * category list deliberately has no independent status switch. New categories
 * default to Active.
 */
export default function CategoryFormModal({ modal, busy, error, onClose, onSave }) {
  const { t } = useI18n();
  // Localized names are keyed by locale code and mapped to the stored column
  // names only when the payload is built.
  const [values, setValues] = useState({
    ku: modal.values.name_ku || '',
    fa: modal.values.name_fa || '',
    ar: modal.values.name_ar || '',
    en: modal.values.name_en || '',
    icon: modal.values.icon || 'utensils',
    sort_order: modal.values.sort_order ?? 0,
    active: modal.values.active !== false,
  });
  const [localError, setLocalError] = useState(null);

  const submit = () => {
    const named = LOCALES.some((l) => String(values[l.code] || '').trim() !== '');
    if (!named) {
      setLocalError('NAME_REQUIRED');
      return;
    }
    setLocalError(null);
    onSave(
      {
        name_ku: values.ku,
        name_fa: values.fa,
        name_ar: values.ar,
        name_en: values.en,
        icon: values.icon,
        sort_order: Number(values.sort_order) || 0,
        active: values.active,
      },
      modal.id,
    );
  };

  return (
    <Modal
      title={modal.mode === 'edit' ? t('menu_edit_category') : t('menu_create_category')}
      subtitle={t('menu_category_active_hint')}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            {t('action_cancel')}
          </button>
          <button className="btn btn--primary" onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="check" size={16} />}
            {t('action_save')}
          </button>
        </>
      }
    >
      {error || localError ? (
        <div style={{ marginBottom: 14 }}>
          <Alert kind="error">{catalogErrorText(error || localError, t)}</Alert>
        </div>
      ) : null}

      <div className="form-grid">
        {LOCALES.map((l) => (
          <Field key={l.code} label={`${t('menu_category_name')} · ${l.label}`}>
            <input
              className="input"
              dir={l.rtl ? 'rtl' : 'ltr'}
              value={values[l.code] || ''}
              onChange={(e) => setValues((s) => ({ ...s, [l.code]: e.target.value }))}
            />
          </Field>
        ))}
      </div>

      <div className="form-grid" style={{ marginTop: 14 }}>
        <Field label={t('menu_category_icon')}>
          <Select
            value={values.icon}
            onChange={(v) => setValues((s) => ({ ...s, icon: v }))}
            options={ICON_OPTIONS.map((i) => ({ value: i, label: i }))}
          />
        </Field>
        <Field label={t('label_sort_order')}>
          <input
            className="input"
            type="number"
            value={values.sort_order}
            onChange={(e) => setValues((s) => ({ ...s, sort_order: Number(e.target.value) }))}
          />
        </Field>
      </div>

      <div style={{ marginTop: 14 }}>
        <Switch
          checked={values.active}
          onChange={(v) => setValues((s) => ({ ...s, active: v }))}
          label={t('label_active')}
          ariaLabel={t('label_active')}
        />
        <div className="field__hint" style={{ marginTop: 6 }}>{t('menu_category_active_hint')}</div>
      </div>
    </Modal>
  );
}
