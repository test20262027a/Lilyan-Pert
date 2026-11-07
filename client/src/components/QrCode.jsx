import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * QR codes are generated on the client from the real menu URL.
 * `qrcode` renders to a data URL, so the image can also be downloaded directly.
 */
export default function QrCode({ value, size = 170, label }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!value) {
      setSrc(null);
      return () => {
        alive = false;
      };
    }
    /*
     * Three device pixels per displayed pixel plus the standard quiet zone:
     * the code stays sharp on a high-density screen and in the print stylesheet
     * rather than being upscaled from a phone-sized bitmap.
     */
    QRCode.toDataURL(value, { margin: 2, width: size * 3, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setSrc(null);
      });
    return () => {
      alive = false;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        style={{ width: size, height: size, borderRadius: 12, background: 'var(--surface-3)', display: 'grid', placeItems: 'center' }}
        aria-label={label}
      >
        <span className="spinner" />
      </div>
    );
  }

  return <img src={src} width={size} height={size} alt={label || 'QR'} style={{ borderRadius: 10, background: '#fff' }} />;
}
