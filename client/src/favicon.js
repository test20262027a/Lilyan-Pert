/*
 * The browser tab icon of the platform — drawn from the business's own logo.
 *
 * The logo stored in Business Profile is the only source of truth: when it is
 * replaced the saved URL changes, so the next paint regenerates the icon set
 * instead of reusing a stale one. Everything the browser needs (16, 32, 48 for
 * the tab and 180 for iOS) is rasterised once from that picture, cropped to the
 * visible artwork so a logo with empty margins still fills the tab, and kept
 * transparent so the mark never sits on a foreign coloured plate.
 *
 * The generated set is memoised in sessionStorage, which is what keeps the tab
 * showing the brand icon on the very first frame after a refresh — before the
 * business record has been fetched again.
 */

const CACHE_KEY = 'lilyan.brand.icon.v1';
const SIZES = [16, 32, 48];
const TOUCH_SIZE = 180;

/** The application's own mark, used only while no business logo is configured. */
const FALLBACK = [{ size: null, href: '/favicon.svg', type: 'image/svg+xml' }];

/* undefined = no decision yet, null = the fallback is showing, url = that logo. */
let appliedUrl;

function setLinks(icons, touch) {
  document.head.querySelectorAll('link[data-brand-icon]').forEach((link) => link.remove());
  for (const icon of icons) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = icon.type || 'image/png';
    if (icon.size) link.sizes = `${icon.size}x${icon.size}`;
    link.href = icon.href;
    link.dataset.brandIcon = '1';
    document.head.appendChild(link);
  }
  if (touch) {
    const link = document.createElement('link');
    link.rel = 'apple-touch-icon';
    link.sizes = `${TOUCH_SIZE}x${TOUCH_SIZE}`;
    link.href = touch;
    link.dataset.brandIcon = '1';
    document.head.appendChild(link);
  }
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(entry) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* Private mode or a full quota: the icon simply regenerates next time. */
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // An absolute logo URL only rasterises when the host allows CORS; a stored
    // upload is same-origin and needs nothing.
    if (/^https?:\/\//i.test(url)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    img.src = url;
  });
}

/**
 * The visible artwork of the picture: its bounding box, free of the transparent
 * margin around it, plus whether the ink is dark enough to need a light halo
 * when the tabs are dark.
 */
function visibleArt(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  if (!canvas.width || !canvas.height) return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  let luminance = 0;
  let counted = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 16) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      luminance += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      counted += 1;
    }
  }
  if (x1 < 0 || !counted) return null;

  return {
    canvas,
    x: x0,
    y: y0,
    w: x1 - x0 + 1,
    h: y1 - y0 + 1,
    dark: luminance / counted < 0.45,
  };
}

/** One square icon: the whole artwork, centred, edge to edge, no empty margin. */
function drawIcon(art, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const scale = Math.min(size / art.w, size / art.h);
  const w = Math.max(1, Math.round(art.w * scale));
  const h = Math.max(1, Math.round(art.h * scale));
  const x = Math.round((size - w) / 2);
  const y = Math.round((size - h) / 2);

  // Dark ink would disappear into a dark tab strip; a soft white halo keeps the
  // mark readable there and is invisible on a light one.
  if (art.dark) {
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = Math.max(1, size * 0.08);
    ctx.drawImage(art.canvas, art.x, art.y, art.w, art.h, x, y, w, h);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
  ctx.drawImage(art.canvas, art.x, art.y, art.w, art.h, x, y, w, h);

  return canvas.toDataURL('image/png');
}

async function buildIconSet(url) {
  const img = await loadImage(url);
  const art = visibleArt(img);
  if (!art) return null;
  return {
    icons: SIZES.map((size) => ({ size, href: drawIcon(art, size) })),
    touch: drawIcon(art, TOUCH_SIZE),
  };
}

/**
 * Points the tab icon at the business logo.
 *
 * `undefined` means the business record has not arrived yet — the last icon set
 * of this session is kept so a refresh never flickers back to another mark.
 * `null` means the business genuinely has no logo, and the bundled mark is used.
 */
export function applyBrandFavicon(logoUrl) {
  if (logoUrl === undefined) {
    const cached = readCache();
    if (cached?.icons?.length && appliedUrl !== cached.url) {
      setLinks(cached.icons, cached.touch);
      appliedUrl = cached.url;
    }
    return;
  }

  if (!logoUrl) {
    if (appliedUrl !== null) {
      setLinks(FALLBACK);
      appliedUrl = null;
    }
    return;
  }

  // Already showing this exact logo: nothing to regenerate, so nothing flickers.
  if (appliedUrl === logoUrl) return;

  const cached = readCache();
  if (cached?.url === logoUrl && cached.icons?.length) {
    setLinks(cached.icons, cached.touch);
    appliedUrl = logoUrl;
    return;
  }

  appliedUrl = logoUrl;
  buildIconSet(logoUrl)
    .then((set) => {
      if (appliedUrl !== logoUrl) return;
      if (!set) {
        setLinks(FALLBACK);
        return;
      }
      writeCache({ url: logoUrl, icons: set.icons, touch: set.touch });
      setLinks(set.icons, set.touch);
    })
    .catch(() => {
      // A logo the browser cannot rasterise keeps the application mark rather
      // than an empty tab; the URL is not retried for this page load.
      if (appliedUrl === logoUrl) setLinks(FALLBACK);
    });
}
