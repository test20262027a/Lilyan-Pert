import { useMemo, useState } from 'react';
import Icon from '../Icon';
import { Alert, ConfirmDialog, Switch } from '../ui';
import { useI18n } from '../../i18n';
import MenuModalFrame from '../menu/MenuModalFrame';
import { tablesErrorText } from './errorText';

/*
 * Create / edit one table.
 *
 * The same dialog shell as Add Category and Add Product, so the module's dialogs
 * stay one family: illustrated banner header, scrolling form body, white action
 * footer and exactly one Close control (physical left under RTL).
 *
 * A table's name is one stored value (`tables.name`), not a four-language record,
 * so it is a single input. Seating capacity and the zone are optional extras of
 * the existing schema; the active flag is what decides whether the table's public
 * QR link resolves at all.
 *
 * Editing never touches `qr_token`: a link already printed and stuck on a table
 * keeps working when the table is renamed or reseated.
 */
export default function TableFormModal({ modal, tables = [], busy, error, onClose, onSave }) {
  const { t } = useI18n();
  const isCreate = !modal.id;

  const initial = useMemo(
    () => ({
      name: modal.values.name || '',
      seats: String(modal.values.seats ?? 4),
      zone: modal.values.zone || '',
      active: modal.values.active !== false,
    }),
    [modal],
  );

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
    const name = values.name.trim();
    if (!name) {
      setLocalError('NAME_REQUIRED');
      return;
    }
    const seats = Number(values.seats);
    if (!Number.isInteger(seats) || seats < 1 || seats > 40) {
      setLocalError('SEATS_INVALID');
      return;
    }
    // Accidental duplicate inside this business only — the API enforces the same
    // rule server-side, so it holds even if this check is bypassed.
    const duplicate = tables.some(
      (tb) => tb.id !== modal.id && String(tb.name).trim().toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      setLocalError('TABLE_DUPLICATE');
      return;
    }

    setLocalError(null);
    onSave({ name, seats, zone: values.zone.trim(), active: values.active }, modal.id);
  };

  return (
    <MenuModalFrame
      title={isCreate ? t('table_create') : t('table_edit')}
      icon="table"
      // While the discard confirmation is up it owns the Escape key.
      onClose={confirmDiscard ? () => {} : requestClose}
      footer={
        <>
          <button type="button" className="mcmodal__btn mcmodal__btn--save" onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" /> : null}
            {t('action_save')}
          </button>
          <button type="button" className="mcmodal__btn mcmodal__btn--cancel" onClick={requestClose} disabled={busy}>
            {t('action_cancel')}
          </button>
        </>
      }
    >
      {error || localError ? (
        <Alert kind="error">{tablesErrorText(error || localError, t)}</Alert>
      ) : null}

      <section className="mcmodal__section">
        <label className="mcmodal__section-head" htmlFor="table-name">
          <span className="mcmodal__bar" aria-hidden="true" />
          <span className="mcmodal__label">{t('table_name')}</span>
          <span className="mcmodal__req" aria-hidden="true">*</span>
        </label>
        <input
          id="table-name"
          className="mcmodal__input mcmodal__input--wide"
          value={values.name}
          maxLength={80}
          placeholder={t('table_name')}
          onChange={(e) => set('name', e.target.value)}
        />
      </section>

      <section className="mcmodal__section">
        <label className="mcmodal__section-head" htmlFor="table-seats">
          <span className="mcmodal__bar" aria-hidden="true" />
          <span className="mcmodal__label">{t('table_seats')}</span>
        </label>
        <input
          id="table-seats"
          className="mcmodal__input mcmodal__input--wide"
          type="number"
          min="1"
          max="40"
          inputMode="numeric"
          value={values.seats}
          onChange={(e) => set('seats', e.target.value)}
        />
      </section>

      <section className="mcmodal__section">
        <label className="mcmodal__section-head" htmlFor="table-zone">
          <span className="mcmodal__bar" aria-hidden="true" />
          <span className="mcmodal__label">{t('table_zone')}</span>
        </label>
        <input
          id="table-zone"
          className="mcmodal__input mcmodal__input--wide"
          value={values.zone}
          maxLength={60}
          onChange={(e) => set('zone', e.target.value)}
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
              <Icon name={values.active ? 'check' : 'close'} size={17} />
            </span>
            <div>
              <div className="mcmodal__status-title">
                {values.active ? t('label_active') : t('label_inactive')}
              </div>
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
