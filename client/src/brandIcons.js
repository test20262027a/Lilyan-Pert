import { get, put } from './api';

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
 * Every icon — plain and maskable — is drawn on a pure white plate, so Chrome's
 * install icon, the Android home screen, the launcher and the splash screen all
 * show the same thing: the mark alone on white, never a themed or tinted
 * background. The maskable variant keeps the mark inside Android's safe zone,
 * so a circular or rounded mask can never cut a letter off.
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

/*
 * Every install icon sits on the same plate: pure white.
 *
 * A launcher, the Chrome install dialog and the Android splash each paint the
 * picture over a background of their own choosing, so a transparent icon or a
 * tinted one ends up on a plate nobody picked. Painting white here makes the
 * installed mark identical everywhere — the brand logo alone, centred, with
 * nothing but white behind it, whatever the business theme is.
 */
const ICON_PLATE = '#ffffff';

/** Identifies the plate the stored set was drawn on, so a change redraws it. */
const ICON_STYLE = 'white-plate-v1';

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
async function buildIconSet(logoUrl) {
  const img = await loadLogo(logoUrl);
  const box = visibleBox(img);
  if (!box) throw new Error('LOGO_EMPTY');

  const icons = SIZES.map((size) => ({
    size,
    maskable: false,
    data_url: drawSquare(img, box, size, {
      background: ICON_PLATE,
      scale: 1 - PLAIN_PADDING * 2,
    }),
  }));
  icons.push({
    size: MASKABLE_SIZE,
    maskable: true,
    // The same white plate, with the mark inside Android's safe zone so a
    // circular or rounded mask can never crop a letter off.
    data_url: drawSquare(img, box, MASKABLE_SIZE, {
      background: ICON_PLATE,
      scale: MASKABLE_SCALE,
    }),
  });
  return icons;
}

/* The logo + plate this page already synced, and the sync in flight for it. */
let synced;
let running;

/** What a stored set has to match to be current: the same logo on the same plate. */
function signatureFor(logoUrl) {
  return logoUrl ? `${ICON_STYLE}|${logoUrl}` : null;
}

/**
 * Brings the stored icon set in line with the saved logo.
 *
 * Called whenever the authenticated shell has a business: the status the server
 * reports is the source of truth, so this is cheap when nothing changed (one
 * small request) and a full regeneration only when the logo really differs —
 * including after a backup restore or a logo uploaded from another device.
 * A failure is never fatal: the tab icon and the bundled PWA icons stay in use.
 */
export function syncBrandIcons(logoUrl, { force = false } = {}) {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const signature = signatureFor(logoUrl);
  if (!force && synced === signature) return Promise.resolve(null);
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
      // A set drawn on another plate (the old accent-tinted maskable icon, or a
      // transparent one) is stale even when the logo is the same, so the style
      // the server reports is compared too.
      if (
        !force
        && status?.logo_url === logoUrl
        && status?.style === ICON_STYLE
        && status.sizes?.length
      ) {
        synced = signature;
        return null;
      }
      const icons = await buildIconSet(logoUrl);
      await put('/manage/brand-icons', { logo_url: logoUrl, style: ICON_STYLE, icons });
      synced = signature;
      return icons.length;
    } finally {
      running = null;
    }
  })();

  return running;
}
