import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../Icon';
import { Field, Select } from '../../ui';
import { localized, useI18n } from '../../../i18n';

/* The modal footer's Save button submits this form by its id. */
export const ORDER_EDIT_FORM_ID = 'odm-edit-form';

/*
 * The Edit Mode body of the Order Details modal.
 *
 * It shows only what an administrator may change — customer name, phone, notes
 * and the item lines — and nothing else from the details view: no identity
 * block, no summary, no activity, no print. The footer owns Save and Cancel, so
 * the form itself has no action row.
 *
 * Customer details are saved through `PATCH /orders/:id`, the item list through
 * `PUT /orders/:id/items` and only when the lines actually changed, so a
 * customer-detail edit can never rewrite the order's money. The server stays
 * authoritative for prices, tax, service charge and the total.
 *
 * The form keeps its state while the modal saves, so a failed save leaves every
 * value the administrator typed exactly where it was.
 */
export default function OrderEditPanel({
  order,
  items = [],
  products = [],
  busy,
  onSubmit,
  onDirtyChange,
}) {
  const { t, locale } = useI18n();
  const nextKey = useRef(0);

  const [values, setValues] = useState({
    customer_name: order.customer_name || '',
    customer_phone: order.customer_phone || '',
    notes: order.notes || '',
  });
  const [lines, setLines] = useState(
    (items.length ? items : [{}]).map((item) => ({
      key: item.id || `saved-${nextKey.current++}`,
      product_id: item.product_id || '',
      quantity: item.quantity || 1,
    })),
  );

  const activeProducts = useMemo(() => products.filter((p) => p.active && p.available), [products]);

  // The item list is sent only when it differs from what the order holds now.
  const itemsChanged = useMemo(() => {
    const before = items.map((i) => `${i.product_id}:${Number(i.quantity)}`).join('|');
    const after = lines
      .filter((l) => l.product_id)
      .map((l) => `${l.product_id}:${Number(l.quantity) || 0}`)
      .join('|');
    return before !== after;
  }, [items, lines]);

  const dirty =
    values.customer_name !== (order.customer_name || '') ||
    values.customer_phone !== (order.customer_phone || '') ||
    values.notes !== (order.notes || '') ||
    itemsChanged;

  // The modal's Cancel and close paths ask before discarding unsaved work.
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const setLine = (index, patch) =>
    setLines((all) => all.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const save = (event) => {
    event.preventDefault();
    if (busy) return;
    // Native constraints already reject a quantity outside 1–99; this keeps an
    // all-empty item list from ever replacing the order's real lines.
    const cleaned = lines
      .filter((line) => line.product_id && Number(line.quantity) > 0)
      .map((line) => ({ product_id: line.product_id, quantity: Number(line.quantity) }));
    onSubmit(values, itemsChanged && cleaned.length ? cleaned : null);
  };

  return (
    <form id={ORDER_EDIT_FORM_ID} className="odm-edit" onSubmit={save}>
      <section className="odm-card">
        <header className="odm-card__head">
          <span className="odm-card__icon">
            <Icon name="users" size={16} />
          </span>
          <h3 className="odm-card__title">{t('label_customer')}</h3>
        </header>
        <div className="form-grid">
          <Field label={t('label_customer_name')}>
            <input
              className="input"
              value={values.customer_name}
              disabled={busy}
              maxLength={120}
              onChange={(e) => setValues((v) => ({ ...v, customer_name: e.target.value }))}
            />
          </Field>
          <Field label={t('label_customer_phone')}>
            <input
              className="input"
              dir="ltr"
              value={values.customer_phone}
              disabled={busy}
              maxLength={40}
              onChange={(e) => setValues((v) => ({ ...v, customer_phone: e.target.value }))}
            />
          </Field>
          <Field label={t('label_notes')} className="span-2">
            <textarea
              className="textarea"
              value={values.notes}
              disabled={busy}
              maxLength={500}
              onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
            />
          </Field>
        </div>
      </section>

      <section className="odm-card">
        <header className="odm-card__head">
          <span className="odm-card__icon">
            <Icon name="coffee" size={16} />
          </span>
          <h3 className="odm-card__title">{t('od_products')}</h3>
          <span className="odm-card__count">{lines.length}</span>
        </header>

        <div className="odm-edit__items">
          {lines.map((line, index) => (
            <div className="odm-edit__line" key={line.key}>
              <Select
                value={line.product_id}
                disabled={busy}
                onChange={(value) => setLine(index, { product_id: value })}
                placeholder={t('order_select_product')}
                options={activeProducts.map((p) => ({
                  value: p.id,
                  label: localized(p, 'name', locale),
                }))}
              />
              <input
                className="input odm-edit__qty"
                type="number"
                required
                min="1"
                max="99"
                aria-label={t('label_quantity')}
                value={line.quantity}
                disabled={busy}
                onChange={(e) => setLine(index, { quantity: e.target.value })}
              />
              <button
                type="button"
                className="btn btn--icon btn--danger-soft"
                aria-label={t('action_delete')}
                disabled={busy || lines.length === 1}
                onClick={() => setLines((all) => all.filter((_, i) => i !== index))}
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn--sm"
            disabled={busy}
            onClick={() =>
              setLines((all) => [
                ...all,
                { key: `new-${nextKey.current++}`, product_id: '', quantity: 1 },
              ])
            }
          >
            <Icon name="plus" size={14} />
            {t('order_add_item')}
          </button>
        </div>
      </section>
    </form>
  );
}
