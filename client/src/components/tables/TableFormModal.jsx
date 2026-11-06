import { useEffect, useMemo, useState } from 'react';
import Icon from '../Icon';
import { Alert, Switch } from '../ui';
import { LOCALES, useI18n } from '../../i18n';
import MenuModalFrame from '../menu/MenuModalFrame';
import ModalActions from '../ModalActions';
import DiscardChangesDialog from '../confirm/DiscardChangesDialog';
import TablesArtwork from './TablesArtwork';
import { tablesErrorText } from './errorText';
import { isVipTable, nextTableNumber, tableNamesFor } from '../../tableNaming';
import { get } from '../../api';

/*
 * Create / edit one table.
 *
 * The same dialog shell as Add Category and Add Product, so the module's dialogs
 * stay one family: illustrated banner header, scrolling form body, white action
 * footer and exactly one Close control (physical left under RTL).
 *
 * A table has exactly one of TWO types, and the type decides its numbering:
 * regular tables count 1, 2, 3… and VIP tables count 1, 2, 3… independently, so
 * a business with ten regular tables still starts at VIP 1. The number is shown
 * — never typed — and the four localized names are generated from the type and
 * the number, so a table can never carry a name that disagrees with its number.
 *
 * The number on screen is provisional: the server reserves it when the dialog is
 * saved, and an administrator creating a table at the same moment simply gets
 * the next one. `qr_token` is never touched, so a printed code keeps working
 * through a rename, a renumber or a type change.
 */

/*
 * Physical card positions in the reference (Kurdish RTL): English top-right,
 * Kurdish top-left, Persian bottom-right, Arabic bottom-left. A right-to-left
 * grid fills its first cell on the right, so this order produces exactly that
 * arrangement and mirrors naturally under English LTR.
 */
const CARD_ORDER = ['en', 'ku', 'fa', 'ar'];

const TABLE_TYPES = [
  { type: 'regular', icon: 'table', label: 'table_type_regular', hint: 'table_type_regular_hint' },
  { type: 'vip', icon: 'crown', label: 'table_type_vip', hint: 'table_type_vip_hint' },
];

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

/** One past the highest display order this business already uses. */
const nextOrder = (rows) =>
  rows.reduce((max, row) => {
    const n = Number(row.display_order);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0) + 1;

export default function TableFormModal({ modal, tables = [], busy, error, onClose, onSave }) {
  const { t, enabledLanguages } = useI18n();
  const isCreate = !modal.id;
  // Only enabled languages get a name preview; hidden ones still receive their
  // generated name from the server.
  const cardCodes = CARD_ORDER.filter((code) => enabledLanguages.includes(code));

  const initial = useMemo(() => {
    const v = modal.values || {};
    return {
      type: isCreate ? 'regular' : isVipTable(v) ? 'vip' : 'regular',
      number: isCreate ? '' : asText(v.table_number),
      seats: asText(isCreate ? 4 : v.seats ?? 4),
      order: asText(isCreate ? nextOrder(tables) : v.display_order ?? 0),
      active: isCreate ? true : v.active !== false,
    };
  }, [modal, tables, isCreate]);

  const [values, setValues] = useState(initial);
  // The next free number of each type, as the server reports it. Only a
  // suggestion: saving reserves the real one.
  const [nextNumbers, setNextNumbers] = useState(() => ({
    regular: nextTableNumber(tables, 'regular'),
    vip: nextTableNumber(tables, 'vip'),
  }));
  const [localError, setLocalError] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Editing a field clears the validation message it caused.
  const set = (key, value) => {
    setValues((s) => ({ ...s, [key]: value }));
    setLocalError(null);
  };

  const typeChanged = values.type !== initial.type;
  /* A new table, a type change and a table saved before numbers existed all take
     the next number of the chosen type; anything else keeps the number it has. */
  const shownNumber = isCreate || typeChanged || !initial.number
    ? nextNumbers[values.type]
    : initial.number;

  // Ask the server for this type's next number whenever the type is chosen, so
  // the suggestion accounts for numbers already used and never reused.
  useEffect(() => {
    let alive = true;
    get(`/manage/tables/next-number?type=${values.type}`)
      .then((data) => {
        if (alive && Number(data?.number) > 0) {
          setNextNumbers((state) => ({ ...state, [data.type || values.type]: data.number }));
        }
      })
      .catch(() => {
        /* The dialog keeps the local suggestion; saving reports a real failure. */
      });
    return () => {
      alive = false;
    };
  }, [values.type]);

  const names = tableNamesFor(values.type, shownNumber);

  const dirty = Object.keys(initial).some((key) => initial[key] !== values[key]);

  const requestClose = () => {
    if (busy) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const submit = () => {
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

    setLocalError(null);
    onSave(
      {
        type: values.type,
        // Empty seats and order are left out, so the API keeps what it has (or
        // its own default) instead of storing a made-up zero.
        ...(seats === null ? {} : { seats }),
        ...(order === null ? {} : { display_order: order }),
        active: values.active,
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

      {/* Exactly two types. The chosen one decides the numbering sequence and
          the naming template — there is no third option and no manual name. */}
      <div className="tform__types" role="radiogroup" aria-label={t('table_type')}>
        {TABLE_TYPES.map((option) => {
          const on = values.type === option.type;
          return (
            <button
              key={option.type}
              type="button"
              role="radio"
              aria-checked={on}
              className={`ttype ttype--${option.type} ${on ? 'is-on' : ''}`}
              onClick={() => set('type', option.type)}
            >
              <span className="ttype__ico" aria-hidden="true">
                <Icon name={option.icon} size={20} />
              </span>
              <span className="ttype__text">
                <strong>{t(option.label)}</strong>
                <small>{t(option.hint)}</small>
              </span>
              <span className="ttype__tick" aria-hidden="true">
                {on ? <Icon name="check" size={12} /> : null}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table number on the reading start (physical right under RTL), seats opposite. */}
      <div className="tform__pair">
        <label className="tform__field" htmlFor="table-number">
          <span className="tform__label">
            {t('table_number')}
            <em className="tform__auto">{t('table_number_auto')}</em>
          </span>
          <input
            id="table-number"
            className="mcmodal__input tform__num"
            readOnly
            value={shownNumber || ''}
            aria-describedby="table-number-hint"
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
      <p className="tform__hint" id="table-number-hint">
        {isCreate || typeChanged ? t('table_number_next_hint') : t('table_number_fixed_hint')}
      </p>

      <section className="mcmodal__section">
        <div className="mcmodal__section-head">
          <span className="mcmodal__bar" aria-hidden="true" />
          <span className="mcmodal__label">{t('table_name')}</span>
        </div>
        <p className="tform__hint">{t('table_name_generated_hint')}</p>

        <div className="mcmodal__langs">
          {cardCodes.map((code) => {
            const language = localeFor(code);
            return (
              <div className="mcmodal__lang" key={code}>
                <div className="mcmodal__lang-top">
                  <span className="mcmodal__lang-label">{t('table_name')}</span>
                  <span className="mcmodal__badge">{language.label}</span>
                </div>
                <div
                  className="tform__generated"
                  dir={language.rtl ? 'rtl' : 'ltr'}
                  data-language={code}
                >
                  {names[code]}
                </div>
              </div>
            );
          })}
        </div>
      </section>

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

      {/* A switched-off table keeps its record, its number and its QR code, but
          takes no new orders and leaves every table picker until it is switched
          back on. */}
      <div className="tform__vip tform__toggle">
        <div className="tform__vip-info">
          <span className={`tform__crown ${values.active ? '' : 'is-off'}`} aria-hidden="true">
            <Icon name={values.active ? 'checkCircle' : 'alert'} size={19} />
          </span>
          <div className="tform__vip-text">
            <span className="tform__vip-title">
              {values.active ? t('table_active') : t('table_inactive')}
            </span>
            <span className="tform__vip-desc">{t('table_active_hint')}</span>
          </div>
        </div>
        <Switch checked={values.active} onChange={(v) => set('active', v)} ariaLabel={t('table_active')} />
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
