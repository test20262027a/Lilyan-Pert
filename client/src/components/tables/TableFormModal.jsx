import { useMemo, useState } from 'react';
import Icon from '../Icon';
import { Alert, Switch } from '../ui';
import { LOCALES, useI18n } from '../../i18n';
import MenuModalFrame from '../menu/MenuModalFrame';
import ModalActions from '../ModalActions';
import DiscardChangesDialog from '../confirm/DiscardChangesDialog';
import TablesArtwork from './TablesArtwork';
import { tablesErrorText } from './errorText';

/*
 * Create / edit one table.
 *
 * The same dialog shell as Add Category and Add Product, so the module's dialogs
 * stay one family: illustrated banner header, scrolling form body, white action
 * footer and exactly one Close control (physical left under RTL).
 *
 * A table is ONE stored record: the four language inputs map to `name_ku …`
 * `name_en` and the API derives the single `name` the rest of the app reads
 * (orders, receipts, the customer menu) from them. `table_number`, the seating
 * capacity, the display order and the VIP flag are columns of that same row.
 *
 * The number and the display order are only *suggested* here, from the business's
 * own tables — the API enforces the number's uniqueness (and the database has the
 * unique index behind it), so a suggestion that has just been taken is rejected
 * rather than silently duplicated.
 *
 * Editing never touches `qr_token`: a link already printed and stuck on a table
 * keeps working when the table is renamed, renumbered or reseated.
 */

/*
 * Physical card positions in the reference (Kurdish RTL): English top-right,
 * Kurdish top-left, Persian bottom-right, Arabic bottom-left. A right-to-left
 * grid fills its first cell on the right, so this order produces exactly that
 * arrangement and mirrors naturally under English LTR.
 */
const CARD_ORDER = ['en', 'ku', 'fa', 'ar'];

const localeFor = (code) => LOCALES.find((l) => l.code === code);

/** The value a numeric field shows: the stored number, or '' when unset. */
const asText = (value) => (value === null || value === undefined || value === '' ? '' : String(value));

/** A whole number inside [min, max], null when the field is empty, NaN when invalid. */
function wholeInRange(raw, min, max) {
  const text = String(raw ?? '').trim();
  if (text === '') return null;
  const n = Number(text);
  if (!Number.isInteger(n) || n < min || (max !== null && n > max)) return NaN;
  return n;
}

/** One past the highest number this business already uses for `field`. */
const nextValue = (rows, field) =>
  rows.reduce((max, row) => {
    const n = Number(row[field]);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0) + 1;

/** The name the record is labelled with, by the same priority the API uses. */
const NAME_PRIORITY = ['ku', 'fa', 'ar', 'en'];
const displayName = (values, codes = NAME_PRIORITY) =>
  codes.map((code) => values[code].trim()).find(Boolean) || '';

export default function TableFormModal({ modal, tables = [], busy, error, onClose, onSave }) {
  const { t, enabledLanguages } = useI18n();
  const isCreate = !modal.id;
  // Only enabled languages get a name input; hidden ones keep and resubmit
  // their saved names untouched.
  const cardCodes = CARD_ORDER.filter((code) => enabledLanguages.includes(code));

  const initial = useMemo(() => {
    const v = modal.values || {};
    if (!isCreate) {
      return {
        ku: v.name_ku || '',
        fa: v.name_fa || '',
        ar: v.name_ar || '',
        en: v.name_en || '',
        // A table created before numbers existed has none yet: it opens on the
        // next free one instead of blocking the edit.
        number: asText(v.table_number) || String(nextValue(tables, 'table_number')),
        seats: asText(v.seats ?? 4),
        order: asText(v.display_order ?? 0),
        vip: v.vip === true,
      };
    }
    return {
      ku: '',
      fa: '',
      ar: '',
      en: '',
      number: String(nextValue(tables, 'table_number')),
      seats: '4',
      order: String(nextValue(tables, 'display_order')),
      vip: false,
    };
  }, [modal, tables, isCreate]);

  const [values, setValues] = useState(initial);
  const [localError, setLocalError] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Editing a field clears the validation message it caused.
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
    const name = displayName(values, cardCodes);
    if (!name) {
      setLocalError('NAME_REQUIRED');
      return;
    }

    const number = wholeInRange(values.number, 1, null);
    if (number === null) {
      setLocalError('TABLE_NUMBER_REQUIRED');
      return;
    }
    if (Number.isNaN(number)) {
      setLocalError('TABLE_NUMBER_INVALID');
      return;
    }
    // Accidental duplicates inside this business only — the API, and the unique
    // index under it, enforce the very same rule for real.
    const numberTaken = tables.some(
      (tb) => tb.id !== modal.id && Number(tb.table_number) === number,
    );
    if (numberTaken) {
      setLocalError('TABLE_NUMBER_DUPLICATE');
      return;
    }

    const seats = wholeInRange(values.seats, 1, 40);
    if (Number.isNaN(seats)) {
      setLocalError('SEATS_INVALID');
      return;
    }

    const order = wholeInRange(values.order, 0, null);
    if (Number.isNaN(order)) {
      setLocalError('DISPLAY_ORDER_INVALID');
      return;
    }

    const duplicate = tables.some(
      (tb) => tb.id !== modal.id && String(tb.name || '').trim().toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      setLocalError('TABLE_DUPLICATE');
      return;
    }

    setLocalError(null);
    onSave(
      {
        name_ku: values.ku.trim(),
        name_fa: values.fa.trim(),
        name_ar: values.ar.trim(),
        name_en: values.en.trim(),
        table_number: number,
        // Empty seats and order are left out, so the API keeps what it has
        // (or its own default) instead of storing a made-up zero.
        ...(seats === null ? {} : { seats }),
        ...(order === null ? {} : { display_order: order }),
        vip: values.vip,
      },
      modal.id,
    );
  };

  return (
    <MenuModalFrame
      title={isCreate ? t('table_create') : t('table_edit')}
      icon="qr"
      art={<TablesArtwork />}
      className="tform"
      /* While the discard confirmation is up it owns the Escape key. */
      onClose={confirmDiscard ? () => {} : requestClose}
      footer={
        <ModalActions
          primaryLabel={t('action_save')}
          onPrimary={submit}
          loading={busy}
          secondaryLabel={t('action_cancel')}
          onSecondary={requestClose}
          secondaryDisabled={busy}
        />
      }
    >
      {error || localError ? <Alert kind="error">{tablesErrorText(error || localError, t)}</Alert> : null}

      <section className="mcmodal__section">
        <div className="mcmodal__section-head">
          <span className="mcmodal__bar" aria-hidden="true" />
          <span className="mcmodal__label">{t('table_name')}</span>
          <span className="mcmodal__req" aria-hidden="true">*</span>
        </div>
        <p className="tform__hint">{t('table_name')}</p>

        <div className="mcmodal__langs">
          {cardCodes.map((code) => {
            const language = localeFor(code);
            const inputId = `table-name-${code}`;
            return (
              <div className="mcmodal__lang" key={code}>
                <div className="mcmodal__lang-top">
                  <label className="mcmodal__lang-label" htmlFor={inputId}>
                    {t('table_name')}
                  </label>
                  <span className="mcmodal__badge">{language.label}</span>
                </div>
                <input
                  id={inputId}
                  className="mcmodal__input"
                  dir={language.rtl ? 'rtl' : 'ltr'}
                  value={values[code]}
                  maxLength={80}
                  placeholder={t('table_name')}
                  onChange={(e) => set(code, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Table number on the reading start (physical right under RTL), seats opposite. */}
      <div className="tform__pair">
        <label className="tform__field" htmlFor="table-number">
          <span className="tform__label">
            {t('table_number')}
            <span className="mcmodal__req" aria-hidden="true">*</span>
          </span>
          <input
            id="table-number"
            className="mcmodal__input tform__num"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={values.number}
            onChange={(e) => set('number', e.target.value)}
          />
        </label>

        <label className="tform__field" htmlFor="table-seats">
          <span className="tform__label">{t('table_seats')}</span>
          <input
            id="table-seats"
            className="mcmodal__input tform__num"
            type="number"
            min="1"
            max="40"
            step="1"
            inputMode="numeric"
            value={values.seats}
            onChange={(e) => set('seats', e.target.value)}
          />
        </label>
      </div>

      <section className="mcmodal__section">
        <label className="mcmodal__section-head" htmlFor="table-order">
          <span className="mcmodal__bar" aria-hidden="true" />
          <span className="mcmodal__label">{t('menu_display_order')}</span>
        </label>
        <input
          id="table-order"
          className="mcmodal__input mcmodal__input--wide tform__num"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={values.order}
          onChange={(e) => set('order', e.target.value)}
        />
      </section>

      <div className="tform__vip">
        <div className="tform__vip-info">
          <span className="tform__crown" aria-hidden="true">
            <Icon name="crown" size={20} />
          </span>
          <div className="tform__vip-text">
            <span className="tform__vip-title">VIP</span>
            <span className="tform__vip-desc">{t('vip_table_desc')}</span>
          </div>
        </div>
        <Switch checked={values.vip} onChange={(v) => set('vip', v)} ariaLabel="VIP" />
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
