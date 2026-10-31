import { useEffect, useMemo, useState } from 'react';
import HeaderBackdrop from '../../headers/HeaderBackdrop';
import Icon from '../Icon';
import { Alert, Select, Switch } from '../ui';
import { LOCALES, localized, useI18n } from '../../i18n';
import { toZonedInput } from '../../format';
import ModalActions from '../ModalActions';
import DiscardChangesDialog from '../confirm/DiscardChangesDialog';
import AdImageField from './AdImageField';
import { adErrorText } from './errorText';
import { AdModalArtwork } from './AdsArtwork';

/*
 * Physical card positions in the reference (Kurdish / Persian RTL): English
 * top-right, Kurdish top-left, Persian bottom-right, Arabic bottom-left. A
 * right-to-left grid fills its first cell on the right, so this order produces
 * exactly that arrangement and mirrors naturally under English LTR.
 */
const CARD_ORDER = ['en', 'ku', 'fa', 'ar'];

const languageOf = (code) => LOCALES.find((l) => l.code === code) || { label: code, rtl: false };

function initialValues(ad, timeZone) {
  return {
    title_ku: ad.title_ku || '',
    title_fa: ad.title_fa || '',
    title_ar: ad.title_ar || '',
    title_en: ad.title_en || '',
    subtitle_ku: ad.subtitle_ku || '',
    subtitle_fa: ad.subtitle_fa || '',
    subtitle_ar: ad.subtitle_ar || '',
    subtitle_en: ad.subtitle_en || '',
    image_url: ad.image_url || '',
    link_url: ad.link_url || '',
    category_id: ad.category_id || '',
    product_id: ad.product_id || '',
    // The API stores instants; the inputs edit the owner's own wall-clock time.
    starts_at: toZonedInput(ad.starts_at, timeZone),
    ends_at: toZonedInput(ad.ends_at, timeZone),
    placement: ad.placement || 'below_header',
    priority: ad.sort_order ?? 0,
    active: ad.active !== false,
  };
}

/*
 * Create / edit one advertisement.
 *
 * The illustrated header stays fixed, only the light form body scrolls, and the
 * white footer keeps Save / Cancel reachable. The picture is uploaded through
 * the media endpoint first, so the record only ever stores a stored URL — never
 * a temporary browser blob address.
 *
 * The form collects values; every rule (title, URL scheme, schedule, relations,
 * placement, priority, permission) is validated again on the server.
 */
export default function AdFormModal({ modal, products, categories, timeZone, busy, error, onClose, onSave }) {
  const { t, locale, enabledLanguages } = useI18n();
  // Only enabled languages get title/subtitle inputs; hidden ones keep their
  // saved text in `values` and are submitted back unchanged.
  const cardCodes = CARD_ORDER.filter((code) => enabledLanguages.includes(code));
  const [values, setValues] = useState(() => initialValues(modal.values || {}, timeZone));
  const [initial] = useState(() => JSON.stringify(initialValues(modal.values || {}, timeZone)));
  const [localError, setLocalError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);

  const dirty = useMemo(() => JSON.stringify(values) !== initial, [values, initial]);
  const shownError = localError || error;

  const set = (key, value) => {
    setValues((state) => ({ ...state, [key]: value }));
    setLocalError(null);
  };

  const requestClose = () => {
    if (dirty) setAskDiscard(true);
    else onClose?.();
  };

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (askDiscard) setAskDiscard(false);
      else requestClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  });

  // A chosen category narrows the product list to that category's own products.
  const visibleProducts = useMemo(
    () => (values.category_id ? products.filter((p) => p.category_id === values.category_id) : products),
    [products, values.category_id],
  );

  const submit = () => {
    if (!cardCodes.some((code) => String(values[`title_${code}`]).trim())) {
      setLocalError('AD_TITLE_REQUIRED');
      return;
    }
    if (values.starts_at && values.ends_at && values.starts_at > values.ends_at) {
      setLocalError('INVALID_DATE_RANGE');
      return;
    }
    setLocalError(null);
    onSave(
      {
        ...values,
        category_id: values.category_id || null,
        product_id: values.product_id || null,
        link_url: String(values.link_url).trim(),
      },
      modal.id,
    );
  };

  return (
    <div
      className="ad-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        className="ad-modal"
        role="dialog"
        aria-modal="true"
        aria-label={modal.id ? t('marketing_edit_ad') : t('ads_add')}
      >
        <header className="ad-modal__head">
          <HeaderBackdrop />
          <div className="ad-modal__artwrap" aria-hidden="true">
            <AdModalArtwork />
          </div>
          <div className="ad-modal__identity">
            <span className="ad-modal__glyph" aria-hidden="true">
              <Icon name="megaphone" size={22} />
            </span>
            <h2 className="ad-modal__title">
              {modal.id ? t('marketing_edit_ad') : t('ads_add')}
            </h2>
          </div>
          <button
            type="button"
            className="ad-modal__close"
            onClick={requestClose}
            aria-label={t('action_close')}
            title={t('action_close')}
            data-tip-hover-only
            data-tip-side="top"
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="ad-modal__body">
          {/* 1 — advertisement image */}
          <section className="ad-sec">
            <div className="ad-sec__head">
              <span className="ad-sec__bar" aria-hidden="true" />
              <span className="ad-sec__label">{t('marketing_ad_image')}</span>
            </div>

            <AdImageField
              value={values.image_url}
              onChange={(url) => set('image_url', url)}
              onUploading={setUploading}
            />
          </section>

          {/* 2 — title and description, in four languages */}
          <section className="ad-sec">
            <div className="ad-sec__head">
              <span className="ad-sec__bar" aria-hidden="true" />
              <span className="ad-sec__label">{t('marketing_ad_title')}</span>
              <span className="ad-sec__req" aria-hidden="true">*</span>
            </div>

            <div className="ad-langs">
              {cardCodes.map((code) => {
                const language = languageOf(code);
                return (
                  <div className="ad-lang" key={code}>
                    <span className="ad-lang__badge">{language.label}</span>
                    <input
                      className="ad-input"
                      dir={language.rtl ? 'rtl' : 'ltr'}
                      value={values[`title_${code}`]}
                      maxLength={160}
                      placeholder={t('marketing_ad_title')}
                      aria-label={`${t('marketing_ad_title')} · ${language.label}`}
                      onChange={(event) => set(`title_${code}`, event.target.value)}
                    />
                    <textarea
                      className="ad-input ad-textarea"
                      dir={language.rtl ? 'rtl' : 'ltr'}
                      rows={2}
                      value={values[`subtitle_${code}`]}
                      maxLength={1000}
                      placeholder={t('ads_description')}
                      aria-label={`${t('ads_description')} · ${language.label}`}
                      onChange={(event) => set(`subtitle_${code}`, event.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3 — related product and category */}
          <section className="ad-sec">
            <div className="ad-sec__head">
              <span className="ad-sec__bar" aria-hidden="true" />
              <span className="ad-sec__label">{t('ads_related')}</span>
            </div>

            <div className="ad-row">
              <label className="ad-field">
                <span className="ad-field__label">{t('ads_related_product')}</span>
                <Select
                  value={values.product_id}
                  onChange={(next) => set('product_id', next)}
                  aria-label={t('ads_related_product')}
                  options={[
                    { value: '', label: t('ads_none') },
                    ...visibleProducts.map((product) => ({
                      value: product.id,
                      label: localized(product, 'name', locale),
                    })),
                  ]}
                />
              </label>

              <label className="ad-field">
                <span className="ad-field__label">{t('ads_related_category')}</span>
                <Select
                  value={values.category_id}
                  onChange={(next) => {
                    setValues((state) => ({
                      ...state,
                      category_id: next,
                      // A product of another category can never stay paired.
                      product_id: next && state.product_id
                        ? (products.find((p) => p.id === state.product_id)?.category_id === next
                          ? state.product_id
                          : '')
                        : state.product_id,
                    }));
                  }}
                  aria-label={t('ads_related_category')}
                  options={[
                    { value: '', label: t('ads_none') },
                    ...categories.map((category) => ({
                      value: category.id,
                      label: localized(category, 'name', locale),
                    })),
                  ]}
                />
              </label>
            </div>
          </section>

          {/* 4 — custom destination */}
          <section className="ad-sec">
            <div className="ad-sec__head">
              <span className="ad-sec__bar" aria-hidden="true" />
              <span className="ad-sec__label">{t('ads_custom_link')}</span>
            </div>
            <input
              className="ad-input"
              dir="ltr"
              inputMode="url"
              value={values.link_url}
              maxLength={1000}
              placeholder="https://..."
              onChange={(event) => set('link_url', event.target.value)}
            />
          </section>

          {/* 5 — schedule */}
          <div className="ad-row">
            <label className="ad-field">
              <span className="ad-field__label">{t('ads_start_date')}</span>
              <span className="ad-date">
                <input
                  className="ad-input"
                  type="datetime-local"
                  value={values.starts_at}
                  onChange={(event) => set('starts_at', event.target.value)}
                />
                <Icon name="calendar" size={15} />
              </span>
            </label>
            <label className="ad-field">
              <span className="ad-field__label">{t('ads_end_date')}</span>
              <span className="ad-date">
                <input
                  className="ad-input"
                  type="datetime-local"
                  value={values.ends_at}
                  onChange={(event) => set('ends_at', event.target.value)}
                />
                <Icon name="calendar" size={15} />
              </span>
            </label>
          </div>

          {/* 6 — placement and priority */}
          <div className="ad-row">
            <label className="ad-field">
              <span className="ad-field__label">{t('ads_placement')}</span>
              <Select
                value={values.placement}
                onChange={(next) => set('placement', next)}
                aria-label={t('ads_placement')}
                options={[
                  { value: 'below_header', label: t('ads_placement_below_header') },
                  { value: 'menu_end', label: t('ads_placement_menu_end') },
                ]}
              />
            </label>
            <label className="ad-field">
              <span className="ad-field__label">{t('ads_priority')}</span>
              <input
                className="ad-input"
                type="number"
                step="1"
                min="-100000"
                max="100000"
                value={values.priority}
                onChange={(event) => set('priority', event.target.value)}
              />
            </label>
          </div>

          {/* 7 — active state */}
          <div className="ad-switch">
            <span className="ad-switch__label">{t('label_active')}</span>
            <Switch
              checked={values.active !== false}
              onChange={(next) => set('active', next)}
              ariaLabel={t('label_active')}
            />
          </div>

          {shownError ? <Alert kind="error">{adErrorText(shownError, t)}</Alert> : null}
        </div>

        <footer className="ad-modal__foot">
          <ModalActions
            primaryLabel={t('action_save')}
            onPrimary={submit}
            loading={busy}
            primaryDisabled={uploading}
            secondaryLabel={t('action_cancel')}
            onSecondary={requestClose}
            secondaryDisabled={busy}
          />
        </footer>

        <DiscardChangesDialog
          open={askDiscard}
          title={t('ads_discard_title')}
          description={t('ads_discard_text')}
          confirmLabel={t('ads_discard_confirm')}
          cancelLabel={t('ads_discard_keep')}
          onContinue={() => setAskDiscard(false)}
          onDiscard={() => {
            setAskDiscard(false);
            onClose?.();
          }}
        />
      </div>
    </div>
  );
}
