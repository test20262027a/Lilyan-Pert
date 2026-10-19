/*
 * Category icon registry.
 *
 * A category stores a free-form `icon` key (and has no colour column), so this
 * maps that key to a glyph from the app icon set plus one of the reference
 * palette's pastel containers. Unknown keys get a tone derived from the key
 * itself, which keeps every category's accent stable between sessions and
 * preserves whatever each category already saved.
 */
const GLYPHS = {
  coffee: 'coffee',
  tea: 'coffee',
  cold: 'coffee',
  water: 'coffee',
  milkshake: 'coffee',
  hot: 'coffee',
  juice: 'sparkles',
  sparkles: 'sparkles',
  breakfast: 'chefHat',
  lunch: 'chefHat',
  dinner: 'chefHat',
  grill: 'chefHat',
  sandwich: 'utensils',
  burger: 'utensils',
  snack: 'package',
  cookies: 'star',
  cookie: 'star',
  cake: 'star',
  desserts: 'star',
  dessert: 'star',
  waffle: 'layers',
  book: 'book',
  tag: 'tag',
  chart: 'chart',
  cart: 'cart',
  star: 'star',
  table: 'table',
  layers: 'layers',
  image: 'image',
  package: 'package',
  trophy: 'trophy',
  banknote: 'banknote',
  wallet: 'wallet',
  clock: 'clock',
  utensils: 'utensils',
  chefHat: 'chefHat',
};

const TONES = {
  coffee: 'orange',
  hot: 'orange',
  breakfast: 'yellow',
  lunch: 'yellow',
  dinner: 'yellow',
  grill: 'pink',
  tea: 'aqua',
  water: 'aqua',
  cold: 'blue',
  juice: 'orange',
  milkshake: 'purple',
  cake: 'pink',
  desserts: 'pink',
  dessert: 'pink',
  cookie: 'aqua',
  cookies: 'aqua',
  waffle: 'yellow',
  sandwich: 'green',
  burger: 'green',
  snack: 'green',
  utensils: 'blue',
  book: 'purple',
  tag: 'pink',
  chart: 'blue',
  cart: 'green',
  star: 'yellow',
  table: 'aqua',
  layers: 'purple',
  image: 'pink',
  package: 'green',
  trophy: 'yellow',
  banknote: 'green',
  wallet: 'purple',
  clock: 'blue',
  chefHat: 'yellow',
  sparkles: 'purple',
};

const TONE_KEYS = ['orange', 'blue', 'pink', 'purple', 'yellow', 'green', 'aqua'];

export function categoryGlyph(icon) {
  return GLYPHS[icon] || 'utensils';
}

export function categoryTone(icon) {
  if (TONES[icon]) return TONES[icon];
  const text = String(icon || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return TONE_KEYS[hash % TONE_KEYS.length];
}

/** Shared class name for the pastel icon container of a category. */
export function categoryToneClass(icon) {
  return `mtone--${categoryTone(icon)}`;
}
