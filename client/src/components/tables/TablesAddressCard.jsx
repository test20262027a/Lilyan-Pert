import Icon from '../Icon';
import { useI18n } from '../../i18n';

/*
 * The Main Ordering Menu Address — the business's public menu, shown once above
 * the table grid.
 *
 * This address is deliberately NOT a table: it has the address and a working
 * Copy button and nothing else. No QR code, no QR download and no share control
 * belong here, and no table record is created for it. Ordinary table cards keep
 * their full QR controls — this exception applies to this section alone.
 *
 * Under RTL the address sits on the physical right and Copy on the physical
 * left, because the field comes first in the row and mirrors with the language.
 */
export default function TablesAddressCard({ url, copied, onCopy }) {
  const { t } = useI18n();

  return (
    <section className="taddr">
      <h2 className="taddr__title">{t('table_main_address')}</h2>

      <div className="taddr__row">
        <div className="taddr__field">
          <span className="taddr__icon" aria-hidden="true">
            <Icon name="link" size={17} />
          </span>
          <code className="taddr__url" dir="ltr">
            {url}
          </code>
        </div>

        <button
          type="button"
          className="taddr__copy"
          onClick={onCopy}
          disabled={!url}
          title={t('table_copy')}
          aria-label={t('table_copy')}
        >
          <Icon name={copied ? 'check' : 'copy'} size={15} />
          {t('table_copy')}
        </button>
      </div>
    </section>
  );
}
