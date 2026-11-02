/*
 * The public customer-menu addresses of this app, in one place.
 *
 * The main ordering menu and every table QR point at the same established public
 * route (`/m/:businessSlug`) — the table one only adds the table's own stable
 * `qr_token`, which the public API resolves against the business. Nothing here
 * carries a secret or an admin permission.
 */

/**
 * The main ordering menu's own route, without an origin: `/menu/<slug>`.
 *
 * This is the canonical address of the main menu (see App.jsx) and the single
 * source every "open the menu" control builds its link from — same tab or new
 * one, sandbox or production, the destination is always this route.
 */
export function mainMenuPath(slug) {
  if (!slug) return '';
  return `/menu/${slug}`;
}

/** The main ordering menu: `/menu/<slug>` — no table selected. */
export function publicMenuUrl(origin, slug) {
  if (!origin || !slug) return '';
  return `${origin}${mainMenuPath(slug)}`;
}

/**
 * A single table's menu — the short branded address a printed card carries:
 * `/t/<qr_token>`. The token alone opens the menu in that table's QR context,
 * so the code says nothing about the business and stays short enough to read.
 *
 * The older `/m/<slug>?table=<token>` form is still served, which is what makes
 * every code printed before this change keep working; without a token there is
 * nothing table-specific to link to, so the main menu address is returned.
 */
export function tableMenuUrl(origin, slug, token) {
  if (!origin) return '';
  if (token) return `${origin}/t/${token}`;
  return publicMenuUrl(origin, slug);
}

/**
 * A stable, descriptive file name for a downloaded table QR — the business slug
 * plus the table's own name, with characters a file system rejects replaced.
 */
export function qrFileName(slug, tableName) {
  const safe = (value, fallback) =>
    String(value || '')
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback;
  return `${safe(slug, 'menu')}-table-${safe(tableName, 'qr')}-qr.png`;
}

/**
 * Puts text on the clipboard, or throws.
 *
 * The async Clipboard API is tried first; when a browser refuses it (no
 * permission, an insecure origin, a document without focus) the legacy
 * selection copy is attempted before reporting a failure, so a refused copy
 * never looks like a successful one.
 */
export async function copyText(text) {
  if (!text) throw new Error('NOTHING_TO_COPY');

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* fall through to the selection copy */
    }
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } finally {
    area.remove();
  }
  if (!ok) throw new Error('COPY_FAILED');
}
