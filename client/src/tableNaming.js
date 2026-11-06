/*
 * A table's display names, derived from its type and its number.
 *
 * Mirrors server/src/lib/table-naming.js: the server writes the four stored
 * names from the number it reserves, and this helper renders the same four in
 * the form's live preview. Regular tables read "مێزی 7" / "میز 7" / "طاولة 7" /
 * "Table 7"; a VIP table reads "VIP 3" in every language.
 */
const LANGS = ['ku', 'fa', 'ar', 'en'];

const REGULAR_NOUN = { ku: 'مێزی', fa: 'میز', ar: 'طاولة', en: 'Table' };

/** The stored flag or the API's `type` → one of the two table types. */
export const tableTypeOf = (row) =>
  row?.type ? row.type : row?.vip === true ? 'vip' : 'regular';

export const isVipTable = (row) => tableTypeOf(row) === 'vip';

export function tableNamesFor(type, number) {
  const n = Number(number);
  if (!Number.isFinite(n) || n < 1) return { ku: '', fa: '', ar: '', en: '' };
  if (type === 'vip') {
    const name = `VIP ${n}`;
    return { ku: name, fa: name, ar: name, en: name };
  }
  return Object.fromEntries(LANGS.map((code) => [code, `${REGULAR_NOUN[code]} ${n}`]));
}

/**
 * The next number one type would take, read from the tables the page already
 * holds. Only a suggestion for the form — the server reserves the real number.
 */
export function nextTableNumber(tables, type) {
  const vip = type === 'vip';
  const highest = (tables || []).reduce((max, row) => {
    const n = Number(row.table_number);
    return isVipTable(row) === vip && Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return highest + 1;
}
