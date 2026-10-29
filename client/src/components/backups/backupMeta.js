import { fmtNumber } from '../../format';

/*
 * Presentation metadata for the Backup & Restore page.
 *
 * The server owns what a backup contains (lib/backup-modules.js); this file only
 * maps those keys onto an icon, a pastel tone and a translation key. Nothing
 * here decides what is exported, restored or counted.
 */

/** Icon + pastel tone of the twelve cards, in page order (right to left). */
export const CATEGORY_VISUALS = {
  profile: { icon: 'store', tone: 'green' },
  settings: { icon: 'settings', tone: 'slate' },
  menu_products: { icon: 'grid', tone: 'orange' },
  orders: { icon: 'receipt', tone: 'blue' },
  order_history: { icon: 'history', tone: 'purple' },
  tables: { icon: 'qr', tone: 'violet' },
  reviews: { icon: 'star', tone: 'teal' },
  marketing: { icon: 'megaphone', tone: 'pink' },
  team: { icon: 'users', tone: 'blue' },
  appearance: { icon: 'palette', tone: 'purple' },
  printing: { icon: 'print', tone: 'pink' },
  reports: { icon: 'chart', tone: 'cyan' },
};

/** Icon + tone of the eighteen manifest sections (the chips). */
export const SECTION_VISUALS = {
  business_profile: { icon: 'store', tone: 'green' },
  business_settings: { icon: 'settings', tone: 'slate' },
  working_hours: { icon: 'clock', tone: 'slate' },
  menu_categories: { icon: 'grid', tone: 'orange' },
  menu_products: { icon: 'tag', tone: 'orange' },
  featured_products: { icon: 'sparkles', tone: 'amber' },
  orders: { icon: 'receipt', tone: 'blue' },
  order_audit: { icon: 'history', tone: 'purple' },
  tables: { icon: 'qr', tone: 'violet' },
  reviews: { icon: 'star', tone: 'teal' },
  advertisements: { icon: 'megaphone', tone: 'pink' },
  promotions: { icon: 'percent', tone: 'pink' },
  team_members: { icon: 'users', tone: 'blue' },
  editable_text: { icon: 'type', tone: 'purple' },
  menu_settings: { icon: 'sliders', tone: 'purple' },
  receipt_settings: { icon: 'print', tone: 'pink' },
  business_views: { icon: 'eye', tone: 'cyan' },
  activity_reports: { icon: 'chart', tone: 'cyan' },
};

/** Visual for a module key of an older archive, mapped onto its section. */
const MODULE_FALLBACK = {
  business_profile: 'business_profile',
  business_settings: 'business_settings',
  menu_categories: 'menu_categories',
  menu_products: 'menu_products',
  orders: 'orders',
  order_items: 'orders',
  order_audit: 'order_audit',
  receipt_prints: 'order_audit',
  tables: 'tables',
  reviews: 'reviews',
  advertisements: 'advertisements',
  promotions: 'promotions',
  reports: 'business_views',
  business_views: 'business_views',
  media: 'menu_products',
};

export const sectionVisual = (key) => SECTION_VISUALS[key] || { icon: 'database', tone: 'slate' };

export const categoryVisual = (key) => CATEGORY_VISUALS[key] || { icon: 'database', tone: 'slate' };

/*
 * The archive's own name, in the reader's language.
 *
 * The server names generated archives in English ("Full Backup",
 * "Selective Backup (3)"), and rows saved before the archive type was shown as a
 * badge carry that prose in `name`. Those are recognised here and re-rendered
 * from the backup type, so an old archive reads in the current language too.
 * A real file name — an uploaded archive — is always shown exactly as stored.
 */
const GENERATED_NAME = /^(Full|Selective) Backup( \(\d+\)| \(uploaded\))?$/;

export const backupName = (backup, t) => {
  const stored = String(backup?.name || '').trim();
  if (stored && !GENERATED_NAME.test(stored)) return stored;
  if (backup?.backup_type === 'uploaded') return t('backup_type_uploaded');
  if (backup?.backup_type === 'custom' || /^Selective/.test(stored)) return t('backup_type_selective');
  return t('backup_type_full');
};

export const categoryLabel = (t, key) => t(`backup_cat_${key}`);
export const categoryDesc = (t, key) => t(`backup_cat_${key}_desc`);
export const sectionLabel = (t, key) => t(`backup_sec_${key}`);

/**
 * The sections an archive really contains, with their saved record counts.
 * New archives ship a `sections` array; an older one only has module counts, so
 * its modules are folded back onto the section that owns them.
 */
export function manifestSections(manifest, modules = []) {
  if (Array.isArray(manifest?.sections) && manifest.sections.length) return manifest.sections;

  const sectionByModule = Object.fromEntries(modules.map((m) => [m.key, m.section]));
  const counts = manifest?.record_counts || {};
  const out = [];
  const seen = new Set();

  for (const mod of manifest?.modules || []) {
    const sectionKey = sectionByModule[mod.key] || MODULE_FALLBACK[mod.key] || mod.section || mod.key;
    if (seen.has(sectionKey)) continue;
    seen.add(sectionKey);
    const count =
      mod.record_count ??
      counts[mod.key] ??
      (Array.isArray(mod.record_count) ? mod.record_count.length : 0);
    out.push({ key: sectionKey, record_count: count, restorable: true });
  }
  return out;
}

/** A section is "reference only" when the server says it is never written back. */
export const isReferenceOnly = (section, registrySections = []) => {
  if (section.restorable === false) return true;
  const known = registrySections.find((s) => s.key === section.key);
  return known ? known.restorable === false : false;
};

/** Real artifact size, from the saved file — never estimated from record counts. */
export function archiveSize(bytes, locale) {
  const n = Number(bytes) || 0;
  if (n <= 0) return '—';
  if (n < 1024) return `${fmtNumber(n, locale)} B`;
  if (n < 1024 * 1024) return `${fmtNumber(Math.round(n / 1024), locale)} KB`;
  if (n < 1024 * 1024 * 1024) return `${fmtNumber((n / (1024 * 1024)).toFixed(2), locale)} MB`;
  return `${fmtNumber((n / (1024 * 1024 * 1024)).toFixed(2), locale)} GB`;
}

export const initialsOf = (name) => {
  const text = String(name || '').trim();
  if (!text) return '—';
  const parts = text.split(/\s+/);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : text.slice(0, 2)).toUpperCase();
};
