import { useEffect, useMemo, useState } from 'react';
import Icon from '../Icon';
import { Alert, ConfirmDialog, Switch } from '../ui';
import { LOCALES, useI18n } from '../../i18n';
import MenuModalFrame from './MenuModalFrame';
import CategoryIdentityIcon from './CategoryIdentityIcon';
import CategoryIconPicker from './CategoryIconPicker';
import CategoryColorPicker from './CategoryColorPicker';
import { appearanceOf, resolveCategoryAppearance } from './categoryIcons';
import { catalogErrorText } from './errorText';
import './categoryPicker.css';

/*
 * Create / edit category.
 *
 * The four name inputs are ONE category, never four records: they are keyed by
 * locale code here and mapped to the stored columns (name_ku …) only when the
 * payload is built. A missing translation is fine — `localized()` already falls
 * back language by language, so a category saved with only Kurdish still shows
 * a name everywhere.
 *
 * A category also carries an identity: its glyph (`icon`) and its own accent
 * (`icon_color`). For a NEW category both are proposed from the four names as
 * they are typed — "پیتزا" previews the pizza glyph before anything is saved —
 * and an existing category keeps exactly what it saved until the administrator
 * picks another glyph, another accent, or presses the explicit auto-select
 * action. A manual choice switches the live suggestion off, so renaming a
 * category never silently replaces an administrator's icon.
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
  const { t, locale } = useI18n();
  const isCreate = modal.mode !== 'edit';

  // Suggested order: one past the highest saved order, or the app's initial
  // order when the business has no category yet.
  const suggestedOrder = useMemo(() => {
    if (!isCreate || !categories.length) return 0;
    return Math.max(...categories.map((c) => Number(c.sort_order) || 0)) + 1;
  }, [categories, isCreate]);

  const initial = useMemo(() => {
    const saved = appearanceOf(modal.values);
    return {
      ku: modal.values.name_ku || '',
      fa: modal.values.name_fa || '',
      ar: modal.values.name_ar || '',
      en: modal.values.name_en || '',
      icon: saved.icon,
      color: saved.color,
      sortOrder: isCreate ? String(suggestedOrder) : String(modal.values.sort_order ?? 0),
      // New categories default to Active.
      active: modal.values.active !== false,
    };
  }, [modal, isCreate, suggestedOrder]);

  const [values, setValues] = useState(initial);
  const [localError, setLocalError] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  /*
   * The identity the form would save right now. A new category follows its names
   * live; an existing one keeps its saved identity (a stored icon counts as the
   * administrator's own choice) until they ask for the automatic one again.
   */
  const [manual, setManual] = useState(!isCreate);
  const names = useMemo(
    () => CARDS.map((code) => values[code]),
    [values.ku, values.fa, values.ar, values.en],
  );
  const suggestion = useMemo(
    () => resolveCategoryAppearance(names, categories, { excludeId: modal.id }),
    [names, categories, modal.id],
  );
  const appearance = manual
    ? { icon: values.icon, color: values.color }
    : { icon: suggestion.icon, color: suggestion.color };

  const pickAppearance = (patch) => {
    setValues((s) => ({ ...s, ...patch }));
    setManual(true);
  };

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
        icon: appearance.icon,
        icon_color: appearance.color,
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

      {/* Identity: a live preview of the glyph + accent that will be saved. */}
      <section className="mcmodal__section">
        <div className="mcmodal__section-head">
          <span className="mcmodal__bar" aria-hidden="true" />
          <span className="mcmodal__label">{t('menu_category_icon')}</span>
        </div>

        <div className="mcappear">
          <CategoryIdentityIcon
            icon={appearance.icon}
            color={appearance.color}
            size={46}
            variant="raised"
          />
          <div className="mcappear__text">
            <div className="mcappear__name">
              {trimmed(values[locale]) || trimmed(values.en) || trimmed(values.ku) || t('menu_category_icon')}
            </div>
            <p className="mcappear__hint">{t('menu_category_auto_hint')}</p>
          </div>
          <button
            type="button"
            className={`mcappear__auto ${manual ? '' : 'is-active'}`.trim()}
            onClick={() => setManual(false)}
            disabled={busy || !manual}
            title={t('menu_category_auto')}
          >
            <Icon name="sparkles" size={14} />
            {t('menu_category_auto')}
          </button>
        </div>

        {/* Two independent dropdowns replace the always-open glyph / colour grids. */}
        <div className="mcfield-pair">
          <div>
            <label className="mcfield__label" htmlFor="menu-category-icon">
              {t('menu_category_icon')}
            </label>
            <CategoryIconPicker
              id="menu-category-icon"
              value={appearance.icon}
              color={appearance.color}
              disabled={busy}
              onChange={(icon) => pickAppearance({ icon })}
            />
          </div>
          <div>
            <label className="mcfield__label" htmlFor="menu-category-color">
              {t('menu_category_color')}
            </label>
            <CategoryColorPicker
              id="menu-category-color"
              value={appearance.color}
              disabled={busy}
              onChange={(color) => pickAppearance({ color })}
            />
          </div>
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
