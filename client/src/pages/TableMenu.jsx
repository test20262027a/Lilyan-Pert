import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState } from '../components/ui';
import { useI18n } from '../i18n';
import { beginLoading, endLoading } from '../loading';
import CustomerMenu from './CustomerMenu';

/*
 * The short table address: `/t/<token>`.
 *
 * This is what a printed table card carries. The token is the table's own
 * opaque `qr_token` — never its name, number or database id — so the link says
 * nothing about the business and cannot be guessed by counting. The server owns
 * the mapping and answers with the business's public menu address; the panel
 * then opens exactly as the long `/m/<slug>?table=<token>` link does, in the QR
 * ordering context, with the table already identified and no administrator
 * control anywhere on the page.
 *
 * A token that no longer exists (its table was deleted or deactivated) is shown
 * as a plain "this code is no longer valid" notice instead of a broken menu.
 */
export default function TableMenu() {
  const { token } = useParams();
  const { t } = useI18n();
  const [slug, setSlug] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setSlug(null);
    setFailed(false);
    beginLoading('table-menu');
    fetch(`/api/public/table/${encodeURIComponent(token || '')}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('TABLE_NOT_FOUND'))))
      .then((data) => {
        if (!alive) return;
        if (data?.slug) setSlug(data.slug);
        else setFailed(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => endLoading('table-menu'));
    return () => {
      alive = false;
      endLoading('table-menu');
    };
  }, [token]);

  if (failed) {
    return (
      <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <EmptyState icon="qr" title={t('table_link_invalid')} hint={t('table_link_invalid_hint')} />
      </main>
    );
  }

  if (!slug) return null;

  // The panel owns the whole page; the key remounts it for a different table.
  return <CustomerMenu key={token} slug={slug} tableToken={token} />;
}
