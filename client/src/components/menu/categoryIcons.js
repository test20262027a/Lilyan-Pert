/*
 * Category appearance registry.
 *
 * A category has two pieces of identity: the glyph it shows and the colour of
 * that glyph. Both are *meaning*, never the business theme — an Ocean-themed
 * dashboard still shows a Fresh Juice category as an orange citrus, so a row, a
 * heading, a mobile chip and a delete dialog all stay recognisable whatever
 * appearance preset is selected.
 *
 *   icon        the glyph key (one of the `Icon` set)
 *   icon_color  the identity colour saved with the category ("#ea7317")
 *
 * `appearanceOf()` is the single reader of a saved category: it always returns a
 * usable glyph + colour, deriving a stable one from the saved icon key when a
 * record predates `icon_color` (never random — the same row keeps the same
 * accent on every load, reorder, search or language switch).
 *
 * `resolveCategoryAppearance()` is the writer: it reads ALL four localized names
 * of a category, understands their meaning through the multilingual catalogue
 * below and proposes the glyph and accent that meaning owns.
 *
 * Name matching is deliberately *word* based: every name and every keyword is
 * folded to the same letter set and compared as whole words or whole phrases,
 * so "Steak" can never be read as "tea" and "Milkshake" always resolves to the
 * milkshake glyph rather than the generic milk one.
 */

/* ----------------------------------------------------------- palette ----- */

/*
 * Sixteen coordinated identity accents. They are fixed hex values on purpose:
 * `var(--primary)` drives the UI chrome, while these keep each category
 * distinguishable across theme changes.
 */
const PALETTE = [
  ['orange', '#ea7317'],
  ['amber', '#d19407'],
  ['lime', '#79a80d'],
  ['green', '#2f9e5c'],
  ['emerald', '#0f9d76'],
  ['teal', '#0d8f92'],
  ['cyan', '#0a8fc4'],
  ['blue', '#2563eb'],
  ['indigo', '#4f46e5'],
  ['violet', '#7c5cf0'],
  ['magenta', '#b426c9'],
  ['rose', '#d1478f'],
  ['pink', '#e04c7c'],
  ['coral', '#ef5a5a'],
  ['tomato', '#cf3a26'],
  ['copper', '#a3602f'],
];

const INK = Object.fromEntries(PALETTE);

/** Every identity accent, in palette order — used by the form's colour picker. */
export const CATEGORY_COLORS = PALETTE.map(([, ink]) => ink);

/** Fallback identity: a real menu glyph rather than an unrelated product icon. */
const FALLBACK_ICON = 'utensils';
const FALLBACK_COLOR = INK.indigo;

/* --------------------------------------------------- text normalisation -- */

/*
 * Names arrive in Kurdish Sorani, Persian, Arabic and English — often with
 * joined or separated words (آبمیوه / آب میوه), ZWNJ, tatweel, harakat and the
 * Arabic/Persian letter variants (ي/ی, ك/ک, ة/ه, ە/ه, ۆ/و …). Everything is
 * folded once, to a single canonical letter set.
 */
function foldLetters(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed\u0640\u200c\u200d]/g, '')
    .replace(/[يئى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ەھہ]/g, 'ه')
    .replace(/ۆ/g, 'و')
    .replace(/ێ/g, 'ی')
    .replace(/ڵ/g, 'ل')
    .replace(/ڕ/g, 'ر')
    .replace(/ڤ/g, 'ف');
}

/** Compact form: letters and digits only ("Cold Drinks" → "colddrinks"). */
export function foldCategoryName(text) {
  return foldLetters(text).replace(/[^\p{L}\p{N}]+/gu, '');
}

/** Word form: the same letters with single spaces kept, as a delimited phrase. */
function foldPhrase(text) {
  return foldLetters(text)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function nameForm(text) {
  const phrase = foldPhrase(text);
  if (!phrase) return null;
  const words = phrase.split(' ');
  return { phrase: ` ${phrase} `, words, compact: words.join('') };
}

/* -------------------------------------------------------- icon keys ----- */

/*
 * Every glyph the category system may show. `GLYPH_ALIASES` also keeps the
 * short keys records stored before the catalogue existed ('juice', 'cold',
 * 'desserts') resolving to the same kind of glyph, so nothing saved is lost.
 */
const GLYPH_ALIASES = {
  coffee: 'coffee',
  tea: 'teaCup',
  teaCup: 'teaCup',
  hot: 'coffee',
  cold: 'glass',
  water: 'glass',
  glass: 'glass',
  juice: 'citrus',
  citrus: 'citrus',
  milkshake: 'bottle',
  bottle: 'bottle',
  iceCream: 'iceCream',
  icecream: 'iceCream',
  ice_cream: 'iceCream',
  'ice-cream': 'iceCream',
  cake: 'cake',
  cookies: 'cake',
  cookie: 'cake',
  dessert: 'cake',
  desserts: 'cake',
  waffle: 'waffle',
  pancake: 'pancake',
  crepe: 'pancake',
  sandwich: 'sandwich',
  burger: 'sandwich',
  pizza: 'pizza',
  salad: 'leaf',
  leaf: 'leaf',
  bread: 'bread',
  bakery: 'bread',
  croissant: 'croissant',
  breakfast: 'eggFried',
  eggFried: 'eggFried',
  cupSoda: 'cupSoda',
  lunch: 'utensils',
  dinner: 'utensils',
  grill: 'flame',
  main: 'utensils',
  utensils: 'utensils',
  snack: 'package',
  package: 'package',
  chefHat: 'chefHat',
  flame: 'flame',
  sparkles: 'sparkles',
  tag: 'tag',
  star: 'star',
  layers: 'layers',
  image: 'image',
  book: 'book',
  chart: 'chart',
  cart: 'cart',
  table: 'table',
  banknote: 'banknote',
  wallet: 'wallet',
  clock: 'clock',
  trophy: 'trophy',
};

/** Glyph choices offered in the category form's icon picker. */
export const CATEGORY_ICONS = [
  'coffee',
  'teaCup',
  'glass',
  'cupSoda',
  'citrus',
  'iceCream',
  'cake',
  'bottle',
  'waffle',
  'pancake',
  'sandwich',
  'pizza',
  'leaf',
  'bread',
  'croissant',
  'eggFried',
  'chefHat',
  'flame',
  'utensils',
];

/* -------------------------------------------------- semantic catalogue -- */

/*
 * One entry per meaning the platform recognises: the glyph it owns, the accent
 * it owns, and every word that expresses it in Kurdish Sorani, Persian, Arabic
 * and English, plus the usual transliterations. Order matters only as the final
 * tie-break, so the specific meanings come before the generic ones.
 */
const MEANINGS = [
  {
    id: 'juice',
    icon: 'citrus',
    color: 'orange',
    keys: [
      'juice', 'juices', 'fresh juice', 'fresh juices', 'orange juice', 'apple juice',
      'carrot juice', 'fruit juice', 'smoothie', 'smoothies',
      'ابمیوه', 'اب میوه', 'ابمیوه تازه', 'اب میوه تازه', 'ابپرتقال', 'اب پرتقال',
      'اب سیب', 'اب هویج', 'اسموتی', 'اسموتی ها',
      'عصير', 'عصائر', 'عصير طازج', 'عصائر طازجة', 'عصير فواكه', 'عصير برتقال',
      'شهربت', 'شهربتی', 'شهربتی نوێ', 'شهربتی میوه', 'اوی میوه', 'ئاوی میوه', 'ئیسمووزی',
    ],
  },
  {
    id: 'milkshake',
    icon: 'bottle',
    color: 'violet',
    keys: [
      'milkshake', 'milkshakes', 'milk shake', 'shake', 'shakes',
      'میلک شیک', 'میلکشیک', 'شیک',
      'ميلك شيك', 'مخفوق الحليب', 'ميلكشيك',
      'میلک شێک', 'شێک',
    ],
  },
  {
    id: 'coffee',
    icon: 'coffee',
    color: 'copper',
    keys: [
      'coffee', 'coffees', 'espresso', 'cappuccino', 'latte', 'americano', 'mocha',
      'macchiato', 'frappe', 'frappuccino', 'flat white', 'cortado',
      'قهوه', 'قهوه خانه', 'اسپرسو', 'کاپوچینو', 'لاته', 'امریکانو', 'موکا', 'فراپه', 'ماکیاتو',
      'قهوة', 'اسبريسو', 'كابتشينو', 'لاتيه', 'امريكانو', 'موكا', 'فرابيه',
      'قاوه', 'ئیسپرسۆ', 'کاپوچینۆ', 'لاتێ', 'ئەمریکانۆ', 'قاوەخانه',
    ],
  },
  {
    id: 'hotDrink',
    icon: 'coffee',
    color: 'copper',
    keys: [
      'hot drink', 'hot drinks', 'hot beverage', 'hot beverages', 'warm drinks',
      'نوشیدنی گرم', 'نوشیدنی های گرم', 'نوشیدنی داغ', 'نوشیدنیها گرم',
      'مشروب ساخن', 'مشروبات ساخنة', 'مشروبات ساخنه',
      'خواردنەوەی گەرم', 'خواردنەوە گەرم', 'خواردنەوەی گەرمەکان',
    ],
  },
  {
    id: 'tea',
    icon: 'teaCup',
    color: 'green',
    keys: [
      'tea', 'teas', 'infusion', 'infusions', 'herbal', 'matcha', 'chai',
      'green tea', 'black tea',
      'چای', 'چایی', 'دمنوش', 'دمنوش ها', 'چای سبز',
      'شاي', 'شاى', 'اعشاب', 'أعشاب', 'شاي اخضر',
      'چا', 'دەمنووس', 'دمنووس',
    ],
  },
  {
    id: 'coldDrink',
    icon: 'glass',
    color: 'cyan',
    keys: [
      'cold drink', 'cold drinks', 'iced drink', 'iced drinks', 'cold beverage',
      'cold beverages', 'ice drink', 'ice drinks', 'refreshing drinks',
      'نوشیدنی سرد', 'نوشیدنی های سرد', 'نوشیدنی خنک',
      'مشروب بارد', 'مشروبات باردة', 'مشروبات بارده', 'مشروب مثلج',
      'خواردنەوەی سارد', 'خواردنەوە ساردەکان', 'خواردنەوەی ساردەکان',
    ],
  },
  {
    id: 'softDrink',
    icon: 'cupSoda',
    color: 'blue',
    keys: [
      'soft drink', 'soft drinks', 'soda', 'sodas', 'cola', 'pepsi', 'fanta', 'sprite',
      'lemonade', 'mocktail', 'mocktails', 'cocktail', 'cocktails', 'fizzy drinks',
      'نوشابه', 'نوشیدنی گازدار', 'لیموناد', 'کوکتل',
      'مشروبات غازية', 'مشروبات غازيه', 'ليموناضه', 'كوكتيل', 'بيبسي',
      'خواردنەوەی گازدار', 'خواردنەوە گازدارەکان',
    ],
  },
  {
    id: 'drinks',
    icon: 'cupSoda',
    color: 'teal',
    keys: [
      'drinks', 'beverages', 'drink menu', 'beverage list',
      'نوشیدنی', 'نوشیدنی ها', 'نوشیدنیها',
      'مشروبات', 'مشروب',
      'خواردنەوە', 'خواردنەوەکان',
    ],
  },
  {
    id: 'iceCream',
    icon: 'iceCream',
    color: 'pink',
    keys: [
      'ice cream', 'icecream', 'ice creams', 'gelato', 'sundae', 'sundaes', 'sorbet',
      'frozen yogurt',
      'بستنی', 'بستنی ها', 'گلاسه',
      'مثلجات', 'بوظة', 'ايس كريم', 'آيس كريم',
      'بەستەنی', 'بەستنی', 'ئایس کریم',
    ],
  },
  {
    id: 'cake',
    icon: 'cake',
    color: 'rose',
    keys: [
      'cake', 'cakes', 'cheesecake', 'cupcake', 'cupcakes', 'cheese cake',
      'کیک', 'کیک ها', 'چیزکیک',
      'كيك', 'كيكة', 'تشيز كيك',
      'کێک', 'کەیک',
    ],
  },
  {
    id: 'dessert',
    icon: 'cake',
    color: 'magenta',
    keys: [
      'dessert', 'desserts', 'sweet', 'sweets', 'sweet treats',
      'دسر', 'دسرها', 'دسر ها', 'شیرینی',
      'حلويات', 'حلوى', 'حلويات شرقية',
      'شیرینی', 'شیرینیەکان', 'شیرینمه‌نی',
    ],
  },
  {
    id: 'waffle',
    icon: 'waffle',
    color: 'amber',
    keys: ['waffle', 'waffles', 'وافل', 'وافل ها', 'وافڵ'],
  },
  {
    id: 'pancake',
    icon: 'pancake',
    color: 'amber',
    keys: ['pancake', 'pancakes', 'hotcake', 'hotcakes', 'پنکیک', 'پن کیک', 'بان كيك', 'بانكيك', 'پانکێک'],
  },
  {
    id: 'crepe',
    icon: 'pancake',
    color: 'teal',
    keys: ['crepe', 'crepes', 'کرپ', 'کریپ', 'كريب', 'کرێپ'],
  },
  {
    id: 'burger',
    icon: 'sandwich',
    color: 'coral',
    keys: [
      'burger', 'burgers', 'hamburger', 'hamburgers', 'cheeseburger', 'cheeseburgers',
      'برگر', 'همبرگر', 'چیزبرگر', 'برگرها',
      'برجر', 'همبرغر', 'برغر', 'تشيز برجر',
      'بهرگهر', 'ههمبهرگهر',
    ],
  },
  {
    id: 'sandwich',
    icon: 'sandwich',
    color: 'amber',
    keys: [
      'sandwich', 'sandwiches', 'wrap', 'wraps', 'shawarma', 'fries', 'hot dog',
      'hot dogs', 'snack', 'snacks', 'fast food', 'fastfood',
      'ساندویچ', 'ساندویچ ها', 'شاورما', 'سیب زمینی', 'هات داگ', 'پیش غذا', 'اسنک',
      'فست فود', 'فستفود',
      'سندويش', 'سندويشات', 'شاورما', 'بطاطا مقلية', 'هوت دوغ', 'سناكس', 'وجبات سريعة',
      'فاست فوود', 'پهتاته سوورکراوه', 'ئاسنێک',
    ],
  },
  {
    id: 'pizza',
    icon: 'pizza',
    color: 'tomato',
    keys: ['pizza', 'pizzas', 'pitzza', 'pitzzas', 'pitza', 'پیتزا', 'پیتزه', 'پیزا', 'بيتزا', 'بيتزه', 'پيتزا'],
  },
  {
    id: 'salad',
    icon: 'leaf',
    color: 'emerald',
    keys: [
      'salad', 'salads', 'vegetable', 'vegetables', 'healthy', 'vegan', 'vegetarian',
      'سالاد', 'سبزیجات', 'سبزی', 'گیاهی', 'تره بار',
      'سلطه', 'سلطات', 'خضار', 'نباتي', 'صحي',
      'زەڵاتە', 'سەوزە', 'ڕووەک',
    ],
  },
  {
    id: 'breakfast',
    icon: 'eggFried',
    color: 'amber',
    keys: [
      'breakfast', 'breakfasts', 'brunch', 'morning', 'omelette', 'omelet', 'omelettes',
      'eggs', 'egg', 'fried egg',
      'صبحانه', 'املت', 'تخم مرغ', 'بوفه صبحانه',
      'فطور', 'افطار', 'إفطار', 'عجة', 'بيض',
      'به‌یانیان', 'به‌یانی', 'ئۆملێت', 'هێلکه',
    ],
  },
  {
    id: 'croissant',
    icon: 'croissant',
    color: 'copper',
    keys: ['croissant', 'croissants', 'کروسان', 'کروسانت', 'كرواسون', 'کرۆسان'],
  },
  {
    id: 'bakery',
    icon: 'bread',
    color: 'copper',
    keys: [
      'bakery', 'bread', 'breads', 'bun', 'buns', 'toast', 'dough', 'patisserie',
      'نانوایی', 'نان', 'نان ها', 'نان تازه', 'شیرینی خشک',
      'مخبز', 'خبز', 'معجنات', 'توست',
      'نانێ تازه',
    ],
  },
  {
    id: 'mainMeal',
    icon: 'utensils',
    color: 'indigo',
    keys: [
      'main', 'mains', 'main meal', 'main meals', 'main course', 'meal', 'meals',
      'lunch', 'dinner', 'grill', 'grilled', 'kebab', 'steak', 'rice', 'chicken',
      'غذای اصلی', 'غذا', 'غذاها', 'ناهار', 'شام', 'کباب', 'گریل', 'برنج', 'مرغ',
      'استیک', 'خوراک',
      'اطباق رئيسيه', 'طبق رئيسي', 'غداء', 'عشاء', 'كباب', 'مشاوي', 'ارز', 'دجاج', 'وجبه',
      'خواردنی سەرەکی', 'نانی نیوەڕۆ', 'نانی ئێواره', 'کەباب', 'مریشک',
    ],
  },
];

/** Folded keywords, computed once: `{ phrase:' pizza ', words:['pizza'], compact:'pizza' }`. */
const FOLDED = MEANINGS.map((m) => ({
  ...m,
  keys: m.keys.map(nameForm).filter(Boolean),
}));

/**
 * How strongly one name expresses one keyword.
 *
 * The strongest signal is the whole name being the concept ("پیتزا"). Next comes
 * the concept as a whole phrase inside the name ("Fresh Juice Bar"), then a
 * single word equal to it (which is how a joined spelling such as "آبمیوه" meets
 * the keyword "آب میوه"), and only then a long prefix/suffix ("Sandwiches",
 * "freshjuices"). Anything shorter is ignored, which is what keeps "Steak" from
 * ever matching "tea".
 */
function keyScore(name, key) {
  if (name.compact === key.compact) return 4000 + key.compact.length;
  if (name.phrase.includes(key.phrase)) return 1000 + key.compact.length;

  const joined = key.words.join('');
  const long = joined.length >= 5;
  if (name.words.some((word) => word === joined)) return 500 + joined.length;
  if (long && name.words.some((word) => word.startsWith(joined) || word.endsWith(joined))) {
    return 250 + joined.length;
  }
  return 0;
}

/**
 * Best meaning for a set of localized names — each name contributes its own best
 * keyword score, so a category recognized in two languages outranks a coincidental
 * single-word hit elsewhere.
 */
export function matchCategoryMeaning(names = []) {
  const forms = (Array.isArray(names) ? names : [names]).map(nameForm).filter(Boolean);
  if (!forms.length) return null;

  let best = null;
  let bestScore = 0;
  for (const meaning of FOLDED) {
    let score = 0;
    for (const name of forms) {
      let nameBest = 0;
      for (const key of meaning.keys) nameBest = Math.max(nameBest, keyScore(name, key));
      score += nameBest;
    }
    if (score > bestScore) {
      bestScore = score;
      best = meaning;
    }
  }
  return best;
}

/* ------------------------------------------------------ colour choice --- */

const isInk = (value) => /^#[0-9a-f]{6}$/i.test(String(value ?? ''));

/** Mix a hex colour toward white / black — used only past the palette. */
function shiftInk(ink, percent) {
  const target = percent > 0 ? 255 : 0;
  const amount = Math.abs(percent) / 100;
  const channel = (offset) => {
    const value = parseInt(ink.slice(offset, offset + 2), 16);
    return Math.round(value + (target - value) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

function seedOf(names) {
  const text = (Array.isArray(names) ? names : [names]).map(foldCategoryName).join('');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 997;
  return hash;
}

/**
 * For a category whose name says nothing the catalogue knows: first accent
 * around the neutral one that no other category of this business uses yet. Once
 * the whole palette is taken, a stable lighter/darker variant keeps the new
 * category distinguishable.
 */
function pickColor(preferredKey, usedInks, seed) {
  const preferred = INK[preferredKey] || FALLBACK_COLOR;
  const used = new Set(usedInks.filter(isInk).map((ink) => ink.toLowerCase()));
  if (!used.has(preferred)) return preferred;

  const start = Math.max(PALETTE.findIndex(([key]) => key === preferredKey), 0);
  for (let step = 1; step <= PALETTE.length; step += 1) {
    const [, ink] = PALETTE[(start + seed + step) % PALETTE.length];
    if (!used.has(ink)) return ink;
  }

  const level = (seed % 3) + 1;
  const variant = shiftInk(preferred, level % 2 ? level * 12 : -level * 12);
  return used.has(variant.toLowerCase()) ? shiftInk(preferred, 22) : variant;
}

/* ---------------------------------------------------------- public API -- */

/** Glyph for any stored icon key, including the legacy short aliases. */
export function categoryGlyph(icon) {
  const key = String(icon ?? '').trim();
  return GLYPH_ALIASES[key] || GLYPH_ALIASES[key.toLowerCase()] || FALLBACK_ICON;
}

/* Stable accent for a category whose colour was never saved (older records). */
const LEGACY_COLORS = {
  coffee: INK.copper,
  tea: INK.green,
  teaCup: INK.green,
  hot: INK.copper,
  cold: INK.cyan,
  water: INK.cyan,
  glass: INK.cyan,
  cupSoda: INK.blue,
  juice: INK.orange,
  citrus: INK.orange,
  milkshake: INK.violet,
  bottle: INK.violet,
  iceCream: INK.pink,
  icecream: INK.pink,
  cookies: INK.rose,
  cookie: INK.rose,
  cake: INK.rose,
  dessert: INK.magenta,
  desserts: INK.magenta,
  waffle: INK.amber,
  pancake: INK.amber,
  crepe: INK.teal,
  sandwich: INK.amber,
  burger: INK.coral,
  pizza: INK.tomato,
  salad: INK.emerald,
  leaf: INK.emerald,
  bread: INK.copper,
  croissant: INK.copper,
  breakfast: INK.amber,
  eggFried: INK.amber,
  lunch: INK.indigo,
  dinner: INK.indigo,
  grill: INK.tomato,
  snack: INK.lime,
  package: INK.lime,
  chefHat: INK.amber,
  utensils: INK.indigo,
  flame: INK.tomato,
  sparkles: INK.violet,
  star: INK.amber,
  tag: INK.rose,
  layers: INK.blue,
  chart: INK.blue,
  cart: INK.green,
  table: INK.cyan,
  banknote: INK.green,
  wallet: INK.violet,
  clock: INK.blue,
  trophy: INK.amber,
  image: INK.pink,
  book: INK.violet,
};

/** Deterministic accent for an unsaved icon key — never random. */
export function legacyCategoryColor(icon) {
  const key = String(icon ?? '').trim();
  if (LEGACY_COLORS[key]) return LEGACY_COLORS[key];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 997;
  return PALETTE[hash % PALETTE.length][1];
}

/**
 * The saved identity of one category record: its own glyph and its own accent.
 * `icon_color` wins; an older record falls back to a stable accent derived from
 * its saved icon key, so nothing ever shifts colour between renders.
 */
export function appearanceOf(category) {
  const icon = typeof category === 'string' ? category : category?.icon;
  const saved = category && typeof category === 'object' ? category.icon_color : null;
  return {
    icon: categoryGlyph(icon),
    color: isInk(saved) ? saved : legacyCategoryColor(icon),
  };
}

/** Colours already used by the business's other categories. */
function usedColors(categories = [], excludeId) {
  return categories
    .filter((c) => c && c.id !== excludeId)
    .map((c) => appearanceOf(c).color);
}

/**
 * Propose the appearance for a category from ALL of its localized names.
 *
 *   resolveCategoryAppearance(['آبمیوه تازه', 'Fresh Juice'], categories)
 *   → { icon: 'citrus', color: '#ea7317', meaning: 'juice' }
 *
 * A recognized meaning always keeps the glyph and accent that meaning owns, so
 * Pizza is the pizza glyph in warm red and Coffee the coffee glyph in brown. A
 * name with no confident match keeps a neutral menu glyph (`utensils`) and still
 * receives an accent no other category uses.
 */
export function resolveCategoryAppearance(names, existingCategories = [], options = {}) {
  const meaning = matchCategoryMeaning(names);
  const color = meaning
    ? INK[meaning.color]
    : pickColor('indigo', usedColors(existingCategories, options.excludeId), seedOf(names));
  return {
    icon: meaning?.icon || FALLBACK_ICON,
    color,
    meaning: meaning?.id || null,
  };
}
