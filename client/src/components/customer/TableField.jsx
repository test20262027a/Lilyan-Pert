import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon';
import { localized, useI18n } from '../../i18n';
import './tableField.css';

/*
 * The table block of the customer order form.
 *
 * `auto` is the QR case: the table was resolved by the server from the scanned
 * token, so the field is read-only and states that plainly — the guest is never
 * asked to pick a table the QR code already identified.
 *
 * `manual` is the main ordering menu (and the configured QR fallback): a
 * searchable dropdown of the business's own active tables. The panel is
 * portalled and measured against the trigger, so a long list scrolls inside the
 * sheet and can never extend past the viewport, and the search field keeps a
 * long table list usable on a phone.
 */

const GAP = 6;
const EDGE = 8;
const PANEL_MIN = 132;
const PANEL_MAX = 300;

export function tableLabel(row, locale) {
  if (!row) return '';
  const name = localized(row, 'name', locale) || row.name || '';
  const number = row.table_number ? `#${row.table_number}` : '';
  return number ? `${name} · ${number}` : name;
}

export default function TableField({ mode = 'manual', table = null, tables = [], value, onChange }) {
  const { t, locale, dir } = useI18n();
  const rtl = dir === 'rtl';
  const id = useId().replace(/:/g, '');
  const listId = `tfield-${id}-list`;
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [search, setSearch] = useState('');

  const selected = tables.find((row) => row.id === value) || null;

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return tables;
    return tables.filter((row) => {
      const number = row.table_number ? String(row.table_number) : '';
      return tableLabel(row, locale).toLowerCase().includes(needle) || number === needle;
    });
  }, [tables, search, locale]);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(Math.max(rect.width, 200), viewportWidth - EDGE * 2);
    const below = viewportHeight - rect.bottom - EDGE;
    const above = rect.top - EDGE;
    const openUp = below < 220 && above > below;
    const maxHeight = Math.min(PANEL_MAX, Math.max(PANEL_MIN, (openUp ? above : below) - GAP));
    let left = rtl ? rect.right - width : rect.left;
    left = Math.min(Math.max(EDGE, left), Math.max(EDGE, viewportWidth - width - EDGE));
    setPos({
      left,
      width,
      maxHeight,
      ...(openUp
        ? { bottom: Math.max(EDGE, viewportHeight - rect.top + GAP) }
        : { top: rect.bottom + GAP }),
    });
  }, [rtl]);

  useEffect(() => {
    if (!open) return undefined;
    place();
    const onMove = () => place();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, place]);

  // The search field owns the focus as soon as the panel opens.
  useEffect(() => {
    if (!open) return undefined;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      if (panelRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setSearch('');
    triggerRef.current?.focus();
  };

  const choose = (row) => {
    onChange?.(row.id);
    close();
  };

  if (mode === 'auto') {
    return (
      <div className="tfield">
        <span className="tfield__label">
          <Icon name="table" size={14} />
          {t('customer_table_your')}
        </span>
        <div className="tfield__auto" role="status">
          <span className="tfield__autoicon" aria-hidden="true">
            <Icon name="table" size={17} />
          </span>
          <span className="tfield__autotext">
            <strong>{tableLabel(table, locale)}</strong>
            <small>{t('customer_table_qr_help')}</small>
          </span>
          <span className="tfield__verified" title={t('customer_table_identified')}>
            <Icon name="checkCircle" size={17} />
          </span>
        </div>
      </div>
    );
  }

  const panel = open && pos
    ? createPortal(
        <div
          ref={panelRef}
          className="tfield-pop"
          style={{ left: pos.left, width: pos.width, maxHeight: pos.maxHeight, ...(pos.top ? { top: pos.top } : { bottom: pos.bottom }) }}
          data-dir={dir}
          onMouseDown={(event) => event.preventDefault()}
        >
          <div className="tfield-pop__search">
            <Icon name="search" size={14} />
            <input
              ref={searchRef}
              value={search}
              placeholder={t('customer_table_search')}
              aria-label={t('customer_table_search')}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  close();
                }
                if (event.key === 'Enter' && rows.length === 1) {
                  event.preventDefault();
                  choose(rows[0]);
                }
              }}
            />
          </div>
          {rows.length === 0 ? (
            <p className="tfield-pop__empty">{t('customer_table_empty')}</p>
          ) : (
            <ul className="tfield-pop__list" id={listId} role="listbox" aria-label={t('customer_menu_cart_table')}>
              {rows.map((row) => (
                <li
                  key={row.id}
                  role="option"
                  aria-selected={row.id === value}
                  className={`tfield-opt ${row.id === value ? 'is-selected' : ''}`}
                  onClick={() => choose(row)}
                >
                  <span className="tfield-opt__lead" aria-hidden="true">
                    <Icon name="table" size={15} />
                  </span>
                  <span className="tfield-opt__text">
                    <strong>{localized(row, 'name', locale) || row.name}</strong>
                    {row.table_number ? <small>#{row.table_number}</small> : null}
                  </span>
                  <span className="tfield-opt__check" aria-hidden="true">
                    {row.id === value ? <Icon name="check" size={15} /> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="tfield">
      <span className="tfield__label">
        <Icon name="table" size={14} />
        {t('customer_menu_cart_table')}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className={`tfield__trigger ${open ? 'is-open' : ''} ${selected ? 'is-chosen' : ''}`.trim()}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={t('customer_table_select')}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span className="tfield__icon" aria-hidden="true">
          <Icon name="table" size={16} />
        </span>
        <span className={`tfield__value ${selected ? '' : 'is-placeholder'}`}>
          {selected ? (
            <>
              <strong>{localized(selected, 'name', locale) || selected.name}</strong>
              {selected.table_number ? <small>#{selected.table_number}</small> : null}
            </>
          ) : (
            t('customer_menu_cart_table_placeholder')
          )}
        </span>
        <Icon name="chevronDown" size={15} className="tfield__chevron" />
      </button>
      {panel}
    </div>
  );
}
