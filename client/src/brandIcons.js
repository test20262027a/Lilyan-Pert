import { get, put } from './api';
import { primaryFor } from './theme';

/*
 * The installed application's icon set, drawn from the REAL business logo.
 *
 * Chrome shows the manifest's icons on the Home Screen, in the install dialog
 * and on the splash screen, and a manifest is a static file the browser reads
 * without running the app — so the pictures cannot be drawn on the fly at
 * install time. They are therefore prepared once, here, from the very logo the
 * administrator saved in Business Branding, and stored on the server
 * (`/api/manage/brand-icons`). The public manifest then serves them, which is
 * what makes the installed Lilyan Pert carry the restaurant's own mark and
 * follow it: replacing the logo replaces the set, and the manifest moves to the
 * new version.
 *
 * The drawing follows the same rules as the tab icon: the artwork's visible box
 * (not its empty margin) is centred, proportions are never distorted, and
 * nothing is repainted — the original colours, shapes and transparency survive.
 * A separate maskable variant keeps the mark inside Android's safe zone on a
 * plate of the business's own accent, so a circular or rounded mask can never
 * cut a letter off.
 */

/** Every square Chrome or Android asks for, plus the 1024 master. */
const SIZES = [48, 72, 96, 144, 192, 384, 512, 1024];

/** The one maskable size the manifest advertises. */
const MASKABLE_SIZE = 512;

/*
 * Breathing room around the mark. The plain icons keep a slim margin so the
 * picture is never flush against a launcher's crop; the maskable one keeps the
 * mark well inside the centre 80% circle every Android mask is guaranteed to
 * show.
 */
const PLAIN_PADDING = 0.06;
const MASKABLE_SCALE = 0.56;

/** The logo, decoded. Fetched as a blob so a cross-origin picture cannot taint the canvas. */
async function loadLogo(url) {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('LOGO_FETCH_FAILED');
  const objectUrl = URL.createObjectURL(await res.blob());
  const img = new Image();
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('LOGO_DECODE_FAILED'));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
  return img;
}

/** The picture's own box, free of the transparent margin around it. */
function visibleBox(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 16) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function drawSquare(img, box, size, { background, scale }) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }
  // Contain, never crop and never stretch: the longer side decides the scale.
  const room = size * (scale || 1);
  const factor = Math.min(room / box.w, room / box.h);
  const w = Math.max(1, Math.round(box.w * factor));
  const h = Math.max(1, Math.round(box.h * factor));
  ctx.drawImage(
    img,
    box.x,
    box.y,
    box.w,
    box.h,
    Math.round((size - w) / 2),
    Math.round((size - h) / 2),
    w,
    h,
  );
  return canvas.toDataURL('image/png');
}

/** Every icon of the set, as the API expects them. */
async function buildIconSet(logoUrl, theme) {
  const img = await loadLogo(logoUrl);
  const box = visibleBox(img);
  if (!box) throw new Error('LOGO_EMPTY');

  const icons = SIZES.map((size) => ({
    size,
    maskable: false,
    data_url: drawSquare(img, box, size, { scale: 1 - PLAIN_PADDING * 2 }),
  }));
  icons.push({
    size: MASKABLE_SIZE,
    maskable: true,
    // The plate carries the business's own accent, so the icon still belongs to
    // this brand when a launcher masks it into a circle.
    data_url: drawSquare(img, box, MASKABLE_SIZE, {
      background: primaryFor(theme),
      scale: MASKABLE_SCALE,
    }),
  });
  return icons;
}

/* The logo this page already synced, and the sync in flight for it. */
let synced;
let running;

/**
 * Brings the stored icon set in line with the saved logo.
 *
 * Called whenever the authenticated shell has a business: the status the server
 * reports is the source of truth, so this is cheap when nothing changed (one
 * small request) and a full regeneration only when the logo really differs —
 * including after a backup restore or a logo uploaded from another device.
 * A failure is never fatal: the tab icon and the bundled PWA icons stay in use.
 */
export function syncBrandIcons(logoUrl, { theme, force = false } = {}) {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!force && synced === (logoUrl || null)) return Promise.resolve(null);
  if (running) return running;

  running = (async () => {
    try {
      const status = await get('/public/brand/icons/status').catch(() => null);
      if (!logoUrl) {
        // The logo was removed: drop the set so the bundled icons take over
        // rather than keeping a mark that is no longer the business's.
        if (status?.sizes?.length) await put('/manage/brand-icons', { logo_url: null, icons: [] });
        synced = null;
        return 0;
      }
      if (!force && status?.logo_url === logoUrl && status.sizes?.length) {
        synced = logoUrl;
        return null;
      }
      const icons = await buildIconSet(logoUrl, theme);
      await put('/manage/brand-icons', { logo_url: logoUrl, icons });
      synced = logoUrl;
      return icons.length;
    } finally {
      running = null;
    }
  })();

  return running;
}
