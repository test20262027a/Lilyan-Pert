import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtDigits } from '../../format';
import useMediaQuery from '../../hooks/useMediaQuery';

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
 *
 * How many numbered plates are drawn is a responsive limit — four on a wide
 * screen, three on a tablet, one on a phone — and the window always slides so
 * the current page stays inside it. The row never wraps and never grows past
 * those limits; only the arrows and the "1 / 6" readout sit beside them.
 */
const NUMBERS_DESKTOP = 4;
const NUMBERS_TABLET = 3;
const NUMBERS_MOBILE = 1;

const gap = (side) => ({ gap: side });

/**
 * The items to draw: a window of at most `limit` consecutive page numbers that
 * always contains `page`, with a marker on either side where numbers are left
 * out. The window is clamped to the first and last page instead of shrinking.
 */
function pageItems(page, pages, limit) {
  const size = Math.min(limit, pages);
  const start = Math.min(Math.max(page - Math.floor((size - 1) / 2), 1), pages - size + 1);
  const items = [];
  if (start > 1) items.push(gap('start'));
  for (let n = start; n < start + size; n += 1) items.push(n);
  if (start + size - 1 < pages) items.push(gap('end'));
  return items;
}

export default function OrdersPagination({ page = 1, pages = 1, onPage }) {
  const { t, locale } = useI18n();
  const wide = useMediaQuery('(min-width: 1200px)');
  const medium = useMediaQuery('(min-width: 768px)');
  if (pages <= 1) return null;

  const limit = wide ? NUMBERS_DESKTOP : medium ? NUMBERS_TABLET : NUMBERS_MOBILE;

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
        {pageItems(page, pages, limit).map((item) =>
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
            <li key={item.gap} className="pager__gap" aria-hidden="true">
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
