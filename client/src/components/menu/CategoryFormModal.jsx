import { useMemo, useState } from 'react';
import Icon from '../Icon';
import { Alert, ConfirmDialog, Switch } from '../ui';
import { LOCALES, useI18n } from '../../i18n';
import MenuModalFrame from './MenuModalFrame';
import { catalogErrorText } from './errorText';

/*
 * Create / edit category.
 *
 * The four name inputs are ONE category, never four records: they are keyed by
 * locale code here and mapped to the stored columns (name_ku …) only when the
 * payload is built. A missing translation is fine — `localized()` already falls
 * back language by language, so a category saved with only Kurdish still shows
 * a name everywhere.
 *
 * The stored `icon` is part of the existing schema but is not a field of this
 * form: create sends the app's established default and edit keeps the row's own
 * value, so editing a category never silently resets its icon.
 *
 * The active flag is edited here and only here — the category list deliberately
 * has no independent status switch.
 */

/*
 * Physical card positions in the reference (Kurdish RTL): English top-right,
 * Kurdish top-left, Persian bottom-right, Arabic bottom-left. A right-to-left
 * grid fills its first cell on the right, so this order produces exactly that
 * arrangement and mirrors naturally under English LTR.
 */
const CARDS = ['en', 'ku', 'fa', 'ar'];

const cardFor = (code) => LOCALES.find((l) => l.code === code);

const trimmed = (value) => String(value ?? '').trim();

export default function CategoryFormModal({ modal, categories = [], busy, error, onClose, onSave }) {
  const { t } = useI18n();
  const isCreate = modal.mode !== 'edit';

  // Suggested order: one past the highest saved order, or the app's initial
  // order when the business has no category yet.
  const suggestedOrder = useMemo(() => {
    if (!isCreate || !categories.length) return 0;
    return Math.max(...categories.map((c) => Number(c.sort_order) || 0)) + 1;
  }, [categories, isCreate]);

  const initial = useMemo(
    () => ({
      ku: modal.values.name_ku || '',
      fa: modal.values.name_fa || '',
      ar: modal.values.name_ar || '',
      en: modal.values.name_en || '',
      icon: modal.values.icon || 'utensils',
      sortOrder: isCreate ? String(suggestedOrder) : String(modal.values.sort_order ?? 0),
      // New categories default to Active.
      active: modal.values.active !== false,
    }),
    [modal, isCreate, suggestedOrder],
  );

  const [values, setValues] = useState(initial);
  const [localError, setLocalError] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Editing a field also clears the local validation message it caused.
  const set = (key, value) => {
    setValues((s) => ({ ...s, [key]: value }));
    setLocalError(null);
  };
  const dirty = Object.keys(initial).some((key) => initial[key] !== values[key]);

  const requestClose = () => {
    if (busy) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const submit = () => {
    const names = Object.fromEntries(CARDS.map((code) => [code, trimmed(values[code])]));

    // The default-language policy is the one the API already enforces: at least
    // one language must carry a name.
    if (!CARDS.some((code) => names[code])) {
      setLocalError('NAME_REQUIRED');
      return;
    }
    const order = trimmed(values.sortOrder);
    if (!/^\d+$/.test(order)) {
      setLocalError('SORT_ORDER_INVALID');
      return;
    }
    // Accidental duplicate: the same name, in the same language, already saved
    // on another category of this business.
    const duplicate = categories.some(
      (c) =>
        c.id !== modal.id &&
        CARDS.some(
          (code) =>
            names[code] && trimmed(c[`name_${code}`]).toLowerCase() === names[code].toLowerCase(),
        ),
    );
    if (duplicate) {
      setLocalError('CATEGORY_DUPLICATE');
      return;
    }

    setLocalError(null);
    onSave(
      {
        name_ku: names.ku,
        name_fa: names.fa,
        name_ar: names.ar,
        name_en: names.en,
        icon: values.icon,
        sort_order: Number(order),
        active: values.active,
      },
      modal.id,
    );
  };

  return (
    <MenuModalFrame
      title={isCreate ? t('menu_add_category') : t('menu_edit_category')}
      icon="package"
      /* While the discard confirmation is up it owns the Escape key. */
      onClose={confirmDiscard ? () => {} : requestClose}
      footer={
        <>
          <button
            type="button"
            className="mcmodal__btn mcmodal__btn--save"
            onClick={submit}
            disabled={busy}
          >
            {busy ? <span className="spinner" /> : null}
            {t('action_save')}
          </button>
          <button
            type="button"
            className="mcmodal__btn mcmodal__btn--cancel"
            onClick={requestClose}
            disabled={busy}
          >
            {t('action_cancel')}
          </button>
        </>
      }
    >
      {error || localError ? <Alert kind="error">{catalogErrorText(error || localError, t)}</Alert> : null}

      <section className="mcmodal__section">
        <div className="mcmodal__section-head">
          <span className="mcmodal__bar" aria-hidden="true" />
          <span className="mcmodal__label">{t('menu_category_name')}</span>
          <span className="mcmodal__req" aria-hidden="true">*</span>
        </div>

        <div className="mcmodal__langs">
          {CARDS.map((code) => {
            const locale = cardFor(code);
            const inputId = `menu-category-name-${code}`;
            return (
              <div className="mcmodal__lang" key={code}>
                <div className="mcmodal__lang-top">
                  <label className="mcmodal__lang-label" htmlFor={inputId}>
                    {t('menu_category_name')}
                  </label>
                  <span className="mcmodal__badge">{locale.label}</span>
                </div>
                <input
                  id={inputId}
                  className="mcmodal__input"
                  dir={locale.rtl ? 'rtl' : 'ltr'}
                  value={values[code]}
                  placeholder={t('menu_category_name')}
                  onChange={(e) => set(code, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="mcmodal__section">
        <label className="mcmodal__section-head" htmlFor="menu-category-order">
          <span className="mcmodal__bar" aria-hidden="true" />
          <span className="mcmodal__label">{t('menu_display_order')}</span>
        </label>
        <input
          id="menu-category-order"
          className="mcmodal__input mcmodal__input--wide"
          inputMode="numeric"
          value={values.sortOrder}
          onChange={(e) => set('sortOrder', e.target.value)}
        />
      </section>

      <section className="mcmodal__section">
        <div className="mcmodal__section-head">
          <span className="mcmodal__bar" aria-hidden="true" />
          <span className="mcmodal__label">{t('label_status')}</span>
        </div>

        <div className="mcmodal__status">
          <div className="mcmodal__status-text">
            <span className="mcmodal__status-glyph">
              <Icon name={values.active ? 'checkCircle' : 'xCircle'} size={17} />
            </span>
            <div>
              <div className="mcmodal__status-title">
                {values.active ? t('label_active') : t('label_inactive')}
              </div>
              <p className="mcmodal__status-hint">
                {values.active ? t('menu_status_active_hint') : t('menu_status_inactive_hint')}
              </p>
            </div>
          </div>
          <Switch
            checked={values.active}
            onChange={(v) => set('active', v)}
            ariaLabel={t('label_status')}
          />
        </div>
      </section>

      {confirmDiscard ? (
        <ConfirmDialog
          title={t('confirm_title')}
          message={t('menu_discard_changes')}
          danger
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={() => {
            setConfirmDiscard(false);
            onClose();
          }}
        />
      ) : null}
    </MenuModalFrame>
  );
}
