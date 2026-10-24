import { useMemo, useState } from 'react';
import Icon from '../Icon';
import { Alert, Select, Switch } from '../ui';
import { LOCALES, localized, useI18n } from '../../i18n';
import MenuModalFrame from './MenuModalFrame';
import LanguageFieldsGrid from '../language/LanguageFieldsGrid';
import ModalActions from '../ModalActions';
import DiscardChangesDialog from '../confirm/DiscardChangesDialog';
import ProductImageField from './ProductImageField';
import { catalogErrorText } from './errorText';

/*
 * Create / edit product.
 *
 * One product, four languages: the name and description inputs of every card
 * are keyed by locale code here and mapped to the stored columns (name_ku …)
 * only when the payload is built — a missing translation is fine, `localized()`
 * already falls back language by language.
 *
 * The stored flags stay independent of each other: `active` (public visibility,
 * also governed by the category) is never edited by this form, `available` says
 * whether the product can be ordered right now, and `featured` only marks it as
 * a special/featured item.
 */

/*
 * Physical card positions in the reference (Kurdish RTL): English top-right,
 * Kurdish top-left, Persian bottom-right, Arabic bottom-left. A right-to-left
 * grid fills its first cell on the right, so this order produces exactly that
 * arrangement and mirrors naturally under English LTR.
 */
const CARD_ORDER = ['en', 'ku', 'fa', 'ar'];

/*
 * The four price inputs in the reference's physical order from the left under
 * RTL — Arabic IQD, Persian IRR, Kurdish IQD, English USD — which is this order
 * reversed, because a right-to-left row starts at the right.
 *
 * Kurdish and Arabic are both the business currency, so they are the SAME
 * stored value (`price`): typing in either updates both and a product can never
 * end up with two conflicting IQD prices. The Persian and English fields are
 * the product's optional, hand-entered prices in their own currency. Nothing is
 * ever converted automatically — no exchange rate is invented anywhere.
 */
const PRICE_FIELDS = [
  { code: 'en', currency: 'USD', key: 'price_en' },
  { code: 'ku', currency: null, key: 'price' },
  { code: 'fa', currency: 'IRR', key: 'price_fa' },
  { code: 'ar', currency: null, key: 'price' },
];

const localeFor = (code) => LOCALES.find((l) => l.code === code);

const asText = (value, fallback = '') =>
  value === null || value === undefined || value === '' ? fallback : String(value);

/** A non-negative whole number, null when the field is empty, NaN when invalid. */
const wholeOrNull = (raw) => {
  const text = String(raw ?? '').trim();
  if (text === '') return null;
  const n = Number(text);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
};

/** A non-negative amount, null when empty, NaN when invalid. */
const amountOrNull = (raw) => {
  const text = String(raw ?? '').trim();
  if (text === '') return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

/** Trimmed, deduped tags — Arabic and Latin commas both separate them. */
const parseTags = (raw) => {
  const out = [];
  for (const item of String(raw ?? '').split(/[,،]/)) {
    const tag = item.trim();
    if (!tag) continue;
    if (out.some((existing) => existing.toLowerCase() === tag.toLowerCase())) continue;
    out.push(tag);
  }
  return out;
};

export default function ProductFormModal({ modal, categories, currency = 'IQD', busy, error, onClose, onSave }) {
  const { t, locale, enabledLanguages } = useI18n();
  const isCreate = modal.mode !== 'edit';

  /* Only the languages the owner left enabled get their own name/description
     card and price input. Hidden languages keep their saved values untouched —
     the payload below still submits them, so nothing is ever cleared. */
  const cardCodes = CARD_ORDER.filter((code) => enabledLanguages.includes(code));
  const baseCode = enabledLanguages.includes('ku') ? 'ku' : enabledLanguages.includes('ar') ? 'ar' : 'ku';
  const priceFields = PRICE_FIELDS.filter((field) =>
    field.key === 'price'
      ? field.code === baseCode || enabledLanguages.includes(field.code)
      : enabledLanguages.includes(field.code),
  );

  const initial = useMemo(
    () => ({
      ku: modal.values.name_ku || '',
      fa: modal.values.name_fa || '',
      ar: modal.values.name_ar || '',
      en: modal.values.name_en || '',
      desc_ku: modal.values.description_ku || '',
      desc_fa: modal.values.description_fa || '',
      desc_ar: modal.values.description_ar || '',
      desc_en: modal.values.description_en || '',
      // An untouched price shows the reference's 0; the two alternate-currency
      // prices stay empty until the owner enters them by hand.
      price: asText(modal.values.price, '0'),
      price_fa: asText(modal.values.price_fa),
      price_en: asText(modal.values.price_en),
      category_id: modal.values.category_id || '',
      image_url: modal.values.image_url || null,
      calories: asText(modal.values.calories),
      prep_minutes: asText(modal.values.prep_minutes),
      tags: (Array.isArray(modal.values.tags) ? modal.values.tags : []).join(', '),
      available: modal.values.available !== false,
      featured: modal.values.featured === true,
      active: modal.values.active !== false,
    }),
    [modal],
  );

  const [values, setValues] = useState(initial);
  const [localError, setLocalError] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Editing a field also clears the validation message it caused.
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
    if (uploading) return;

    // At least one of the languages the owner offers must carry a name.
    if (!cardCodes.some((code) => values[code].trim())) {
      setLocalError('NAME_REQUIRED');
      return;
    }

    const price = amountOrNull(values.price);
    if (price === null || Number.isNaN(price)) {
      setLocalError('INVALID_PRICE');
      return;
    }
    const altPrices = { price_fa: amountOrNull(values.price_fa), price_en: amountOrNull(values.price_en) };
    const visibleAltKeys = priceFields.filter((field) => field.key !== 'price').map((field) => field.key);
    if (visibleAltKeys.some((key) => Number.isNaN(altPrices[key]))) {
      setLocalError('INVALID_PRICE');
      return;
    }

    if (!values.category_id) {
      setLocalError('CATEGORY_REQUIRED');
      return;
    }

    const calories = wholeOrNull(values.calories);
    if (Number.isNaN(calories)) {
      setLocalError('INVALID_CALORIES');
      return;
    }
    const prepMinutes = wholeOrNull(values.prep_minutes);
    if (Number.isNaN(prepMinutes)) {
      setLocalError('INVALID_PREP_TIME');
      return;
    }

    setLocalError(null);
    onSave(
      {
        name_ku: values.ku.trim(),
        name_fa: values.fa.trim(),
        name_ar: values.ar.trim(),
        name_en: values.en.trim(),
        description_ku: values.desc_ku,
        description_fa: values.desc_fa,
        description_ar: values.desc_ar,
        description_en: values.desc_en,
        price,
        price_fa: altPrices.price_fa,
        price_en: altPrices.price_en,
        category_id: values.category_id,
        image_url: values.image_url,
        calories,
        prep_minutes: prepMinutes,
        tags: parseTags(values.tags),
        available: values.available,
        featured: values.featured,
        // Not a field of this form: a new product is active, an existing one
        // keeps the state its own rules gave it.
        active: values.active,
        sort_order: Number(modal.values.sort_order) || 0,
      },
      modal.id,
    );
  };

  return (
    <MenuModalFrame
      title={isCreate ? t('menu_add_product') : t('menu_edit_product')}
      icon="package"
      wide
      /* While the discard confirmation is up it owns the Escape key. */
      onClose={confirmDiscard ? () => {} : requestClose}
      footer={
        <ModalActions
          primaryLabel={t('action_save')}
          onPrimary={submit}
          loading={busy}
          primaryDisabled={uploading}
          secondaryLabel={t('action_cancel')}
          onSecondary={requestClose}
          secondaryDisabled={busy}
        />
      }
    >
      {error || localError ? <Alert kind="error">{catalogErrorText(error || localError, t)}</Alert> : null}

      <section className="mcmodal__section">
        <div className="mcmodal__section-head">
          <span className="mcmodal__bar" aria-hidden="true" />
          <span className="mcmodal__label">{t('label_image')}</span>
        </div>
        <ProductImageField
          value={values.image_url}
          onChange={(url) => set('image_url', url)}
          onUploading={setUploading}
        />
      </section>

      <section className="mcmodal__section">
        <div className="mcmodal__section-head">
          <span className="mcmodal__bar" aria-hidden="true" />
          <span className="mcmodal__label">{t('menu_product_name')}</span>
          <span className="mcmodal__req" aria-hidden="true">*</span>
        </div>

        <LanguageFieldsGrid count={cardCodes.length} className="mcmodal__langs">
          {cardCodes.map((code) => {
            const language = localeFor(code);
            return (
              <div className="mcmodal__lang" key={code}>
                <div className="mcmodal__lang-top">
                  <label className="mcmodal__lang-label" htmlFor={`product-name-${code}`}>
                    {t('menu_product_name')}
                  </label>
                  <span className="mcmodal__badge">{language.label}</span>
                </div>
                <input
                  id={`product-name-${code}`}
                  className="mcmodal__input"
                  dir={language.rtl ? 'rtl' : 'ltr'}
                  value={values[code]}
                  placeholder={t('menu_product_name')}
                  onChange={(e) => set(code, e.target.value)}
                />
                <textarea
                  className="mcmodal__textarea"
                  dir={language.rtl ? 'rtl' : 'ltr'}
                  rows={2}
                  aria-label={`${t('menu_product_description')} · ${language.label}`}
                  placeholder={t('menu_product_description')}
                  value={values[`desc_${code}`]}
                  onChange={(e) => set(`desc_${code}`, e.target.value)}
                />
              </div>
            );
          })}
        </LanguageFieldsGrid>
      </section>

      <section className="mcmodal__section">
        <div className="mcmodal__section-head">
          <span className="mcmodal__bar" aria-hidden="true" />
          <span className="mcmodal__label">{t('menu_price')}</span>
        </div>

        <div className="mform__prices">
          {priceFields.map((field) => (
            <label className="mform__price" key={field.code}>
              <span className="mform__price-label">
                {localeFor(field.code).label} · {field.currency || currency}
              </span>
              <input
                className="mcmodal__input mform__num"
                dir="ltr"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={values[field.key]}
                onChange={(e) => set(field.key, e.target.value)}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="mcmodal__section">
        <label className="mcmodal__section-head" htmlFor="product-category">
          <span className="mcmodal__bar" aria-hidden="true" />
          <span className="mcmodal__label">{t('menu_categories')}</span>
          <span className="mcmodal__req" aria-hidden="true">*</span>
        </label>

        <Select
          id="product-category"
          value={values.category_id}
          onChange={(next) => set('category_id', next)}
          aria-label={t('menu_categories')}
          placeholder={t('menu_select_category')}
          options={categories.map((c) => ({
            value: c.id,
            label: localized(c, 'name', locale) || c.name_en || c.name_ku || t('menu_uncategorized'),
          }))}
        />
      </section>

      <div className="mform__pair">
        <label className="mform__field">
          <span className="mform__price-label">{t('menu_calories')}</span>
          <input
            className="mcmodal__input mform__num"
            dir="ltr"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={values.calories}
            onChange={(e) => set('calories', e.target.value)}
          />
        </label>
        <label className="mform__field">
          <span className="mform__price-label">{t('menu_prep_time')}</span>
          <input
            className="mcmodal__input mform__num"
            dir="ltr"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={values.prep_minutes}
            onChange={(e) => set('prep_minutes', e.target.value)}
          />
        </label>
      </div>

      <section className="mcmodal__section">
        <div className="mcmodal__section-head">
          <span className="mcmodal__bar" aria-hidden="true" />
          <span className="mcmodal__label">{t('menu_tags')}</span>
        </div>

        <span className="mform__tags">
          <span className="mform__tags-icon" aria-hidden="true">
            <Icon name="tag" size={16} />
          </span>
          <input
            className="mcmodal__input mform__tags-input"
            value={values.tags}
            placeholder={t('menu_tags_placeholder')}
            aria-label={t('menu_tags')}
            onChange={(e) => set('tags', e.target.value)}
          />
        </span>
      </section>

      <div className="mform__toggles">
        <span className="mform__toggle">
          <Switch
            checked={values.available}
            onChange={(v) => set('available', v)}
            ariaLabel={t('menu_available')}
          />
          <span className="mform__toggle-label">{t('menu_available')}</span>
        </span>
        <span className="mform__toggle">
          <Switch
            checked={values.featured}
            onChange={(v) => set('featured', v)}
            ariaLabel={t('menu_featured')}
          />
          <span className="mform__toggle-label">{t('menu_featured')}</span>
        </span>
      </div>

      <DiscardChangesDialog
        open={confirmDiscard}
        onContinue={() => setConfirmDiscard(false)}
        onDiscard={() => {
          setConfirmDiscard(false);
          onClose();
        }}
      />
    </MenuModalFrame>
  );
}
