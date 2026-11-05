/**
 * Which uploaded file belongs to which backup group.
 *
 * The `media` table holds the bytes and nothing else — it has no owner column —
 * so a file is owned by the records that point at it, through the URL the media
 * route hands back (`/api/manage/media/<id>`). The audit below reads every place
 * a business can put a picture:
 *
 *   business_profile  the logo, the menu cover and the login backdrop
 *   menu_products     a product picture
 *   advertisements    an advertisement picture
 *   team_members      a member's profile photo
 *
 * A file nobody points at is reported as unassigned instead of being guessed
 * into a group, and each file is counted once per group it is used by — never
 * once per record that uses it.
 */

const MEDIA_URL = /\/api\/manage\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/** The media id behind a stored URL, or null when it is not one of our files. */
export const mediaIdOf = (url) => {
  const match = typeof url === 'string' ? MEDIA_URL.exec(url) : null;
  return match ? match[1].toLowerCase() : null;
};

/** Every group that owns pictures, with the record query holding the URLs. */
const SOURCES = [
  {
    section: 'business_profile',
    columns: ['logo_url', 'cover_url', 'login_bg_url'],
    query: `SELECT logo_url, cover_url, login_bg_url FROM businesses WHERE id = $1`,
  },
  {
    section: 'menu_products',
    columns: ['image_url'],
    query: `SELECT image_url FROM products WHERE business_id = $1`,
  },
  {
    section: 'advertisements',
    columns: ['image_url'],
    query: `SELECT image_url FROM advertisements WHERE business_id = $1`,
  },
  {
    section: 'team_members',
    columns: ['profile_image_url'],
    query: `SELECT u.profile_image_url FROM users u
              JOIN memberships m ON m.user_id = u.id
             WHERE m.business_id = $1`,
  },
];

export const MEDIA_OWNERS = SOURCES.map((source) => source.section);

/**
 * One audit of a business' uploaded files.
 *
 * Returns every media row of the business, each annotated with the groups that
 * reference it, plus the per-group counts the backup cards show. Rows are the
 * single source of truth: the same file is one row here however many products
 * or advertisements point at its URL.
 */
export async function mediaOwnership(db, businessId) {
  const owners = new Map();
  for (const source of SOURCES) {
    const { rows } = await db.query(source.query, [businessId]);
    for (const row of rows) {
      for (const column of source.columns) {
        const id = mediaIdOf(row[column]);
        if (!id) continue;
        if (!owners.has(id)) owners.set(id, new Set());
        owners.get(id).add(source.section);
      }
    }
  }

  const { rows } = await db.query(
    `SELECT id, mime, byte_size, data, created_at
       FROM media WHERE business_id = $1 ORDER BY created_at`,
    [businessId],
  );

  const byOwner = Object.fromEntries(MEDIA_OWNERS.map((key) => [key, 0]));
  let unassigned = 0;
  let bytes = 0;

  const files = rows.map((row) => {
    const id = String(row.id).toLowerCase();
    const owned = [...(owners.get(id) || [])];
    if (owned.length) owned.forEach((key) => (byOwner[key] += 1));
    else unassigned += 1;
    bytes += Number(row.byte_size) || 0;
    return { ...row, owners: owned };
  });

  return { files, byOwner, unassigned, total: files.length, bytes };
}
