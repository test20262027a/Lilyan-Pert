import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtDigits } from '../../format';

/*
 * Pagination under the dashboard's Recent Orders table.
 *
 * The page it reports is the page the API returned, so the numbers here are
 * always the pages that actually exist for the active status filter. The two
 * steps are icon-only: the shared Icon mirrors directional glyphs inside an
 * RTL document, so a plain chevronLeft always reads as "back" — left in
 * English, right in Kurdish, Persian and Arabic — while the flex row itself
 * follows the document direction, putting "previous" first on the right. The
 * text lives on the buttons as aria-label/title only, never on screen.
 */
const GAP = (index) => `gap-${index}`;

/** The page numbers to draw: first, last and a window around the current one. */
function pageItems(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const around = [page - 1, page, page + 1].filter((n) => n > 1 && n < pages);
  const marks = [1, ...around, pages];
  const items = [];
  let previous = 0;
  for (const n of marks) {
    if (previous && n - previous > 1) items.push(GAP(n));
    items.push(n);
    previous = n;
  }
  return items;
}

export default function OrdersPagination({ page = 1, pages = 1, onPage }) {
  const { t, locale } = useI18n();
  if (pages <= 1) return null;

  const go = (next) => {
    if (next < 1 || next > pages || next === page) return;
    onPage?.(next);
  };
  const num = (n) => fmtDigits(String(n), locale);

  return (
    <nav className="pager" aria-label={t('pager_label')}>
      <button
        type="button"
        className="pager__btn"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label={t('pager_prev')}
        title={t('pager_prev')}
      >
        <Icon name="chevronLeft" size={16} />
      </button>

      <ul className="pager__nums">
        {pageItems(page, pages).map((item) =>
          typeof item === 'number' ? (
            <li key={item}>
              <button
                type="button"
                className={`pager__num ${item === page ? 'is-active' : ''}`.trim()}
                onClick={() => go(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={t('pager_page', { page: num(item) })}
              >
                {num(item)}
              </button>
            </li>
          ) : (
            <li key={item} className="pager__gap" aria-hidden="true">
              …
            </li>
          ),
        )}
      </ul>

      <span className="pager__count">
        {num(page)} / {num(pages)}
      </span>

      <button
        type="button"
        className="pager__btn"
        onClick={() => go(page + 1)}
        disabled={page >= pages}
        aria-label={t('pager_next')}
        title={t('pager_next')}
      >
        <Icon name="chevronRight" size={16} />
      </button>
    </nav>
  );
}
