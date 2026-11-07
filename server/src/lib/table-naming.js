/*
 * Table types and their display names.
 *
 * A table belongs to exactly one type — regular or VIP — and each type carries
 * its own numbering sequence inside a business, so the first VIP table of a
 * business is always VIP 1 whatever number its regular tables reached. The
 * existing `vip` column is that type: there is no second type field.
 *
 * The four localized names are derived here, from the type and the number the
 * database assigned. They are display names only: the number is stored once,
 * on the table row, so switching language can never produce another number.
 */

export const TABLE_TYPES = ['regular', 'vip'];

export const isTableType = (value) => TABLE_TYPES.includes(value);

/** The stored flag → the type the API and the interface speak in. */
export const tableTypeOf = (vip) => (vip ? 'vip' : 'regular');

/** The stored flag for a type. */
export const isVipType = (type) => type === 'vip';

/**
 * The noun each language uses for a regular table. VIP needs no translation —
 * the same short label reads correctly in all four languages.
 */
const REGULAR_NOUN = {
  ku: 'مێزی',
  fa: 'میز',
  ar: 'طاولة',
  en: 'Table',
};

/**
 * The four stored names for a table of `type` carrying `number`.
 * `name` is the resolved display value the rest of the app reads — the same
 * priority the client uses (Kurdish first), so it never disagrees with them.
 */
export function tableNamesFor(type, number) {
  const n = Number(number);
  if (type === 'vip') {
    const name = `VIP ${n}`;
    return { name, name_ku: name, name_fa: name, name_ar: name, name_en: name };
  }
  return {
    name: `${REGULAR_NOUN.ku} ${n}`,
    name_ku: `${REGULAR_NOUN.ku} ${n}`,
    name_fa: `${REGULAR_NOUN.fa} ${n}`,
    name_ar: `${REGULAR_NOUN.ar} ${n}`,
    name_en: `${REGULAR_NOUN.en} ${n}`,
  };
}
