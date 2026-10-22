import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import './select.css';

/*
 * The one selection dropdown of the admin panel.
 *
 * Every Select / combobox trigger renders this component, so the premium
 * floating surface — rounded corners, layered shadow, theme-tinted hover and a
 * checkmark on the saved option — is defined once here and follows the active
 * business theme through the existing `--primary` token ramp.
 *
 * Behaviour is a single-select listbox:
 *  - the trigger stays focused while the list is open, so arrow keys, Home/End,
 *    Enter/Space and Escape work on the real control (aria-activedescendant),
 *  - hover and keyboard highlight are transient (`is-active`), the saved value
 *    keeps its own `is-selected` state and checkmark,
 *  - the panel is portalled and positioned fixed from the trigger's rectangle,
 *    so no card, table or sticky header can clip or cover it, and it flips above
 *    the trigger when the space below is too small.
 */

const PANEL_GAP = 6;
const VIEWPORT = 8;
const PANEL_MAX = 380;
const PANEL_MIN = 140;
const ROW_HEIGHT = 46;
const MIN_WIDTH = 168;

const toKey = (value) => (value === null || value === undefined ? '' : String(value));

export default function Select({
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
  className = '',
  ariaLabel,
  menuMaxHeight = PANEL_MAX,
  id,
  ...rest
}) {
  const { dir } = useI18n();
  const rtl = dir === 'rtl';
  const generatedId = useId();
  const triggerId = id || `lysel-${generatedId.replace(/:/g, '')}`;
  const listId = `${triggerId}-list`;

  const [phase, setPhase] = useState('closed'); // closed | open | closing
  const [pos, setPos] = useState(null);
  const [active, setActive] = useState(-1);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const closeTimer = useRef(null);

  const rows = useMemo(() => {
    const list = options.map((option) => ({
      value: toKey(option.value),
      label: option.label,
      disabled: Boolean(option.disabled),
    }));
    if (placeholder) {
      return [{ value: '', label: placeholder, placeholder: true, disabled: false }, ...list];
    }
    return list;
  }, [options, placeholder]);

  const selectedIndex = rows.findIndex((row) => row.value === toKey(value));
  const selected = selectedIndex >= 0 ? rows[selectedIndex] : null;
  const isOpen = phase !== 'closed';

  const firstEnabled = useCallback(
    (from, step) => {
      for (let i = from; i >= 0 && i < rows.length; i += step) {
        if (!rows[i].disabled) return i;
      }
      return -1;
    },
    [rows],
  );

  /* ------------------------------------------------------------ positioning */

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const width = Math.min(Math.max(rect.width, MIN_WIDTH), viewportWidth - VIEWPORT * 2);
    const estimate = Math.min(menuMaxHeight, rows.length * ROW_HEIGHT + 14);
    const below = viewportHeight - rect.bottom - VIEWPORT;
    const above = rect.top - VIEWPORT;
    const openUp = below < estimate && above > below;
    const available = Math.max(PANEL_MIN, (openUp ? above : below) - PANEL_GAP);
    const maxHeight = Math.min(menuMaxHeight, available);

    let left = rtl ? rect.right - width : rect.left;
    left = Math.min(Math.max(VIEWPORT, left), Math.max(VIEWPORT, viewportWidth - width - VIEWPORT));

    setPos({
      left,
      width,
      maxHeight,
      openUp,
      ...(openUp
        ? { bottom: Math.max(VIEWPORT, viewportHeight - rect.top + PANEL_GAP) }
        : { top: rect.bottom + PANEL_GAP }),
    });
  }, [menuMaxHeight, rows.length, rtl]);

  /* ---------------------------------------------------------- open / close */

  const handleClose = useCallback((refocus = false) => {
    setPhase((current) => (current === 'open' ? 'closing' : current));
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setPhase('closed'), 130);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const handleOpen = useCallback(
    (edge) => {
      window.clearTimeout(closeTimer.current);
      const fallback = firstEnabled(0, 1);
      const start = selectedIndex >= 0 && !rows[selectedIndex]?.disabled ? selectedIndex : fallback;
      setActive(edge === 'last' ? firstEnabled(rows.length - 1, -1) : start);
      setPhase('open');
    },
    [firstEnabled, rows, selectedIndex],
  );

  useEffect(
    () => () => {
      window.clearTimeout(closeTimer.current);
    },
    [],
  );

  // Anchor the panel to the field while the page scrolls or the window resizes.
  useEffect(() => {
    if (phase !== 'open') return undefined;
    place();
    const onMove = () => place();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [phase, place]);

  // Outside press closes without stealing focus from whatever was clicked.
  useEffect(() => {
    if (phase !== 'open') return undefined;
    const onPointerDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      if (panelRef.current?.contains(event.target)) return;
      handleClose(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [phase, handleClose]);

  // Bring the saved option into view inside the list — never the page itself.
  useEffect(() => {
    if (phase !== 'open') return undefined;
    const frame = requestAnimationFrame(() => {
      const list = listRef.current;
      const node = list?.querySelector('[data-current="true"]');
      if (!list || !node) return;
      const top = node.offsetTop - list.clientHeight / 2 + node.offsetHeight / 2;
      list.scrollTop = Math.max(0, top);
    });
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const scrollActiveIntoView = useCallback((index) => {
    const list = listRef.current;
    const node = list?.children?.[index];
    if (!list || !node) return;
    const top = node.offsetTop;
    const bottom = top + node.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, []);

  /* -------------------------------------------------------------- keyboard */

  const choose = useCallback(
    (index) => {
      const row = rows[index];
      if (!row || row.disabled) return;
      handleClose(false);
      if (row.value !== toKey(value)) onChange?.(row.value);
      triggerRef.current?.focus();
    },
    [handleClose, onChange, rows, value],
  );

  const onKeyDown = (event) => {
    if (disabled) return;
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        handleOpen(event.key === 'ArrowUp' ? 'last' : 'first');
      } else if (event.key === 'Enter' || event.key === ' ') {
        // Opens through this handler only; the button's own click stays for mice.
        event.preventDefault();
        handleOpen('first');
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (active < 0) {
          setActive(firstEnabled(0, 1));
          break;
        }
        const next = firstEnabled(active + (event.key === 'ArrowDown' ? 1 : -1), event.key === 'ArrowDown' ? 1 : -1);
        if (next >= 0) {
          setActive(next);
          scrollActiveIntoView(next);
        }
        break;
      }
      case 'Home': {
        event.preventDefault();
        const first = firstEnabled(0, 1);
        setActive(first);
        scrollActiveIntoView(first);
        break;
      }
      case 'End': {
        event.preventDefault();
        const last = firstEnabled(rows.length - 1, -1);
        setActive(last);
        scrollActiveIntoView(last);
        break;
      }
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(active >= 0 ? active : selectedIndex);
        break;
      case 'Escape':
        event.preventDefault();
        handleClose(false);
        break;
      case 'Tab':
        handleClose(false);
        break;
      default:
        break;
    }
  };

  /* ----------------------------------------------------------------- markup */

  const triggerText = selected ? selected.label : placeholder || '';

  const panel =
    isOpen && pos
      ? createPortal(
          <div
            ref={panelRef}
            className={`lysel-pop ${pos.openUp ? 'is-up' : ''} ${phase === 'closing' ? 'is-closing' : ''}`}
            style={{
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              ...(pos.openUp ? { bottom: pos.bottom } : { top: pos.top }),
            }}
            data-dir={dir}
            onMouseDown={(event) => event.preventDefault()}
          >
            <ul
              ref={listRef}
              id={listId}
              className="lysel-pop__list"
              role="listbox"
              aria-label={ariaLabel}
              aria-hidden={phase === 'closing'}
            >
              {rows.map((row, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <li
                    key={`${row.value}-${index}`}
                    role="option"
                    id={`${listId}-${index}`}
                    aria-selected={isSelected}
                    aria-disabled={row.disabled || undefined}
                    data-current={isSelected ? 'true' : undefined}
                    className={[
                      'lysel-opt',
                      row.placeholder ? 'is-placeholder' : '',
                      isSelected ? 'is-selected' : '',
                      index === active ? 'is-active' : '',
                      row.disabled ? 'is-disabled' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onMouseEnter={() => !row.disabled && setActive(index)}
                    onClick={() => choose(index)}
                  >
                    <span className="lysel-opt__text">{row.label}</span>
                    <span className="lysel-opt__check" aria-hidden="true">
                      {isSelected ? <Icon name="check" size={15} /> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <span className={`lysel ${className} ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`.trim()}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className="lysel__trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-label={ariaLabel}
        aria-activedescendant={isOpen && active >= 0 ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (isOpen ? handleClose(false) : handleOpen('first'))}
        onKeyDown={onKeyDown}
        {...rest}
      >
        <span className={`lysel__value ${selected && !selected.placeholder ? '' : 'is-placeholder'}`.trim()}>
          {triggerText}
        </span>
        <Icon name="chevronDown" size={15} className="lysel__chevron" />
      </button>
      {panel}
    </span>
  );
}
