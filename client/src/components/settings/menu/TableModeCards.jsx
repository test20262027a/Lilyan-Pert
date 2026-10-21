import { useI18n } from '../../../i18n';

/*
 * Table identification mode: three full-width radio cards in a single
 * accessible group. The saved mode is the only selected card — the screen never
 * forces the reference screenshot's selection.
 */
export default function TableModeCards({ value, onChange, disabled }) {
  const { t } = useI18n();

  const modes = [
    { value: 'manual', title: t('menu_mode_manual'), hint: t('menu_mode_manual_hint') },
    { value: 'qr', title: t('menu_mode_qr'), hint: t('menu_mode_qr_hint') },
    { value: 'qr_fallback', title: t('menu_mode_fallback'), hint: t('menu_mode_fallback_hint') },
  ];

  return (
    <div className="ms-modes" role="radiogroup" aria-label={t('menu_table_title')}>
      {modes.map((mode) => {
        const active = value === mode.value;
        return (
          <label key={mode.value} className={`ms-mode ${active ? 'is-active' : ''} ${disabled ? 'is-disabled' : ''}`}>
            <input
              type="radio"
              name="ms-table-mode"
              value={mode.value}
              checked={active}
              disabled={disabled}
              onChange={() => onChange(mode.value)}
            />
            <span className="ms-mode__dot" aria-hidden="true" />
            <span className="ms-mode__text">
              <span className="ms-mode__title">{mode.title}</span>
              <span className="ms-mode__hint">{mode.hint}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
