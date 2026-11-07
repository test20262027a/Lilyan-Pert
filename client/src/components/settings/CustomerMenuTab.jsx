import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { SettingsCard, SettingsToggleRow } from './SettingsCard';
import { SetField } from './fields';
import LanguageFieldsGrid from '../language/LanguageFieldsGrid';

/*
 * Customer-menu navigation. Turning the customer menu off also turns the
 * admin-return control off, so the stored configuration can never claim a
 * return button for a menu that is not there. The API enforces the same rule.
 */
export default function CustomerMenuTab({ draft, patch, setEditable, canManage }) {
  const { t, locales } = useI18n();
  const menu = draft.menu_settings || {};
  const customerMenuOn = menu.show_customer_menu !== false;
  const text = draft.editable_text || {};

  const setCustomerMenu = (value) =>
    patch('menu_settings', {
      show_customer_menu: value,
      show_admin_return: value ? menu.show_admin_return !== false : false,
    });

  return (
    <>
      <SettingsCard
        icon="sliders"
        tone="blue"
        title={t('settings_menu_title')}
        subtitle={t('settings_menu_subtitle')}
      >
        <SettingsToggleRow
          icon="store"
          title={t('settings_show_customer_menu')}
          hint={t('settings_customer_menu_hint')}
          checked={customerMenuOn}
          disabled={!canManage}
          onChange={setCustomerMenu}
        />
        <SettingsToggleRow
          icon="dashboard"
          title={t('settings_show_admin_return')}
          hint={t('settings_admin_return_hint')}
          checked={menu.show_admin_return !== false}
          disabled={!canManage || !customerMenuOn}
          onChange={(value) => patch('menu_settings', { show_admin_return: value })}
        />
      </SettingsCard>

      <SettingsCard
        icon="pencil"
        tone="teal"
        title={t('settings_menu_text_title')}
        subtitle={t('settings_description_hint')}
      >
        <div className="set-stack">
          <div>
            <div className="set-group-label">{t('settings_editable_menu_title')}</div>
            {/* Only the enabled languages are rendered, and the shared grid
                gives every one of them an equal share of the card width — one
                language fills the row, three sit side by side when the card is
                wide enough instead of leaving a hole. */}
            <LanguageFieldsGrid count={locales.length}>
              {locales.map((l) => (
                <SetField key={l.code} label={l.label}>
                  <input
                    className="input"
                    dir={l.rtl ? 'rtl' : 'ltr'}
                    value={text.menu_title?.[l.code] || ''}
                    disabled={!canManage}
                    onChange={(event) => setEditable('menu_title', l.code, event.target.value)}
                  />
                </SetField>
              ))}
            </LanguageFieldsGrid>
          </div>

          <div>
            <div className="set-group-label">
              <Icon name="sparkles" size={13} /> {t('settings_editable_welcome')}
            </div>
            <LanguageFieldsGrid count={locales.length}>
              {locales.map((l) => (
                <SetField key={l.code} label={l.label}>
                  <textarea
                    className="textarea"
                    dir={l.rtl ? 'rtl' : 'ltr'}
                    value={text.welcome?.[l.code] || ''}
                    disabled={!canManage}
                    onChange={(event) => setEditable('welcome', l.code, event.target.value)}
                  />
                </SetField>
              ))}
            </LanguageFieldsGrid>
          </div>
        </div>
      </SettingsCard>
    </>
  );
}
