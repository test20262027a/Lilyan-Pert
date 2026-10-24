import { useState } from 'react';
import QRCode from 'qrcode';
import Icon from '../Icon';
import QrCode from '../QrCode';
import { useToast } from '../ui';
import { localized, useI18n } from '../../i18n';
import { copyText, qrFileName } from './menuUrl';

/*
 * One table, one QR code.
 *
 * The card is a vertical stack, exactly as the reference lays it out: the green
 * table icon, the QR of this table's own public menu address, the table's saved
 * name, its saved seating capacity, a divider, then the three controls —
 * Download QR (physical right under RTL), Edit (centre) and Delete (physical
 * left).
 *
 * The QR is generated from the canonical address at render time, so it is always
 * the same code for the same table and never a stored image. Downloading writes
 * the same address as a large PNG built for printing, taken from this table
 * only.
 *
 * Sharing is not a fourth button — the reference card has three — so the QR
 * itself is the link that opens this table's customer menu, and the compact
 * corner control copies or shares this table's address.
 */
export default function TableQrCard({ table, menuUrl, businessSlug, canManage, onEdit, onDelete }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  const seats = Number(table.seats);
  // The table's own name in the language the owner is reading, falling back to
  // the stored display name of a table created before the four languages existed.
  const label = localized(table, 'name', locale) || table.name || '';

  // A large PNG (1024px, full quiet zone) so the printed code scans reliably.
  const download = async () => {
    if (!menuUrl || downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await QRCode.toDataURL(menuUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 1024,
        color: { dark: '#000000', light: '#ffffff' },
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = qrFileName(businessSlug, label);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t('table_download_done'));
    } catch {
      toast.error(t('table_qr_failed'));
    } finally {
      setDownloading(false);
    }
  };

  const share = async () => {
    if (!menuUrl) return;
    try {
      if (navigator.share) await navigator.share({ title: label, url: menuUrl });
      else {
        await copyText(menuUrl);
        toast.success(t('table_copied'));
      }
    } catch (err) {
      // Dismissing the share sheet is not a failure; a refused clipboard is.
      if (err && err.name !== 'AbortError') toast.error(t('table_copy_failed'));
    }
  };

  return (
    <article className="tcard">
      <button
        type="button"
        className="tcard__share"
        onClick={share}
        title={t('table_share')}
        aria-label={`${t('table_share')} — ${label}`}
      >
        <Icon name="share" size={15} />
      </button>

      <span className="tcard__icon" aria-hidden="true">
        <Icon name="utensils" size={21} />
      </span>

      <a
        className="tcard__qr"
        href={menuUrl}
        target="_blank"
        rel="noreferrer"
        title={t('table_open_menu')}
      >
        <QrCode value={menuUrl} size={165} label={`${label} — ${t('table_qr')}`} />
      </a>

      <div className="tcard__name" title={label}>
        {label}
      </div>
      <div className="tcard__seats">
        {Number.isFinite(seats) && seats > 0 ? `${seats} ${t('table_seats')}` : t('label_none')}
      </div>

      <div className="tcard__rule" />

      <div className="tcard__actions">
        <button
          type="button"
          className="tcard__act tcard__act--icon"
          onClick={download}
          disabled={downloading || !menuUrl}
          title={t('table_download_qr')}
          aria-label={`${t('table_download_qr')} — ${label}`}
        >
          {downloading ? <span className="spinner" /> : <Icon name="download" size={16} />}
        </button>

        {canManage ? (
          <>
            <button type="button" className="tcard__act tcard__act--edit" onClick={onEdit}>
              <Icon name="pencil" size={15} />
              {t('action_edit')}
            </button>
            <button
              type="button"
              className="tcard__act tcard__act--del"
              onClick={onDelete}
              title={t('action_delete')}
              aria-label={`${t('action_delete')} — ${label}`}
            >
              <Icon name="trash" size={16} />
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}
