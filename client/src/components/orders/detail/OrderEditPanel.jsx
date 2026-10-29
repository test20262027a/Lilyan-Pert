import { useMemo, useState } from 'react';
import Icon from '../../Icon';
import { Field, Select } from '../../ui';
import { localized, useI18n } from '../../../i18n';

/*
 * Inline order editor, opened from the Order Details modal.
 *
 * It replaces the edit screens of the retired standalone order page: customer
 * name, phone and notes are saved through `PATCH /orders/:id`, and the item list
 * through `PUT /orders/:id/items` — only when the lines actually changed, so a
 * customer-detail edit can never rewrite the order's money. The server stays
 * authoritative for prices, tax, service charge and the total.
 *
 * The form state survives a failed save: the panel stays open with what the
 * administrator typed, and only the parent closes it on success.
 */
export default function OrderEditPanel({ order, items = [], products = [], busy, onSave, onCancel }) {
  const { t, locale } = useI18n();

  const [values, setValues] = useState({
    customer_name: order.customer_name || '',
    customer_phone: order.customer_phone || '',
    notes: order.notes || '',
  });
  const [lines, setLines] = useState(
    (items.length ? items : [{}]).map((item) => ({
      key: item.id || 'new',
      product_id: item.product_id || '',
      quantity: item.quantity || 1,
    })),
  );

  const activeProducts = useMemo(
    () => products.filter((p) => p.active && p.available),
    [products],
  );

  // The item list is sent only when it differs from what the order holds now.
  const itemsChanged = useMemo(() => {
    const before = items.map((i) => `${i.product_id}:${Number(i.quantity)}`).join('|');
    const after = lines
      .filter((l) => l.product_id)
      .map((l) => `${l.product_id}:${Number(l.quantity) || 0}`)
      .join('|');
    return before !== after;
  }, [items, lines]);

  const setLine = (index, patch) =>
    setLines((all) => all.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const save = () => {
    const cleaned = lines
      .filter((line) => line.product_id && Number(line.quantity) > 0)
      .map((line) => ({ product_id: line.product_id, quantity: Number(line.quantity) }));
    onSave(values, itemsChanged && cleaned.length ? cleaned : null);
  };

  return (
    <section className="odm-card odm-edit">
      <header className="odm-card__head">
        <span className="odm-card__icon">
          <Icon name="pencil" size={16} />
        </span>
        <h3 className="odm-card__title">{t('od_edit')}</h3>
      </header>

      <div className="form-grid">
        <Field label={t('label_customer_name')}>
          <input
            className="input"
            value={values.customer_name}
            disabled={busy}
            onChange={(e) => setValues((v) => ({ ...v, customer_name: e.target.value }))}
          />
        </Field>
        <Field label={t('label_customer_phone')}>
          <input
            className="input"
            dir="ltr"
            value={values.customer_phone}
            disabled={busy}
            onChange={(e) => setValues((v) => ({ ...v, customer_phone: e.target.value }))}
          />
        </Field>
        <Field label={t('label_notes')} className="span-2">
          <textarea
            className="textarea"
            value={values.notes}
            disabled={busy}
            onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          />
        </Field>
      </div>

      <div className="odm-edit__items">
        <span className="odm-edit__label">{t('od_products')}</span>
        {lines.map((line, index) => (
          <div className="odm-edit__line" key={line.key}>
            <Select
              value={line.product_id}
              disabled={busy}
              onChange={(value) => setLine(index, { product_id: value })}
              placeholder={t('order_select_product')}
              options={activeProducts.map((p) => ({ value: p.id, label: localized(p, 'name', locale) }))}
            />
            <input
              className="input odm-edit__qty"
              type="number"
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
          onClick={() => setLines((all) => [...all, { key: `new-${all.length}`, product_id: '', quantity: 1 }])}
        >
          <Icon name="plus" size={14} />
          {t('order_add_item')}
        </button>
      </div>

      <div className="odm-edit__actions">
        <button type="button" className="btn btn--sm btn--primary" onClick={save} disabled={busy}>
          {busy ? <span className="spinner" /> : <Icon name="check" size={14} />}
          {t('action_save')}
        </button>
        <button type="button" className="btn btn--sm" onClick={onCancel} disabled={busy}>
          {t('action_cancel')}
        </button>
      </div>
    </section>
  );
}
