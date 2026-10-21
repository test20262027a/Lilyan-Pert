import { useEffect, useRef } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';

/**
 * The settings workspace tab strip.
 *
 * One horizontally scrollable row — never wrapped into uneven rows — so the
 * ten sections stay reachable at every width. Tabs are real buttons with
 * `role=tab`, the arrows follow the reading direction, and the active pill is
 * scrolled back into view when the selection changes from elsewhere (a sidebar
 * link or a deep link).
 */
export default function SettingsTabs({ tabs, value, onChange }) {
  const { rtl } = useI18n();
  const listRef = useRef(null);
  const refs = useRef({});

  useEffect(() => {
    const node = refs.current[value];
    if (!node) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    node.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [value]);

  const move = (event) => {
    const index = tabs.findIndex((tab) => tab.value === value);
    if (index < 0) return;
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    let next = null;
    if (event.key === forward) next = (index + 1) % tabs.length;
    else if (event.key === backward) next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    onChange(tabs[next].value);
    refs.current[tabs[next].value]?.focus();
  };

  return (
    <div className="set-tabs">
      <div className="set-tabs__list" role="tablist" aria-orientation="horizontal" ref={listRef} onKeyDown={move}>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            ref={(node) => {
              refs.current[tab.value] = node;
            }}
            type="button"
            role="tab"
            id={`settings-tab-${tab.value}`}
            aria-selected={value === tab.value}
            aria-controls={`settings-panel-${tab.value}`}
            tabIndex={value === tab.value ? 0 : -1}
            className={`set-tab ${value === tab.value ? 'is-active' : ''}`}
            onClick={() => onChange(tab.value)}
          >
            <span className="set-tab__icon" aria-hidden="true">
              <Icon name={tab.icon} size={15} />
            </span>
            <span className="set-tab__label">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
