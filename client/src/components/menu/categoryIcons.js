/*
 * Category appearance registry.
 *
 * A category has two pieces of identity: the glyph it shows and the colour of
 * that glyph. Both are *meaning*, never the business theme — an Ocean-themed
 * dashboard still shows a Fresh Juice category as an orange citrus, so a row, a
 * heading and a delete dialog all stay recognisable whatever appearance preset
 * is selected.
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
 * of a category, matches their meaning against a multilingual keyword catalogue
 * and proposes a glyph plus a distinguishable colour, avoiding accents already
 * taken by the business's other categories.
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
 * folded to one compact lowercase form before matching so a spelling variant
 * still finds its meaning.
 */
export function foldCategoryName(text) {
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
    .replace(/ڤ/g, 'ف')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

/* -------------------------------------------------------- icon keys ----- */

/*
 * Legacy aliases: records created before the catalogue existed store short
 * icon keys ('juice', 'cold', 'desserts'). They keep resolving to the same
 * kind of glyph, so nothing saved is lost.
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
  breakfast: 'chefHat',
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
  'chefHat',
  'utensils',
  'package',
  'flame',
];

/* -------------------------------------------------- semantic catalogue -- */

/*
 * One entry per meaning the platform recognises. `keys` are matched after
 * folding, in all four languages plus the common transliterations; a longer
 * keyword wins, so "ice cream" is never read as "cream" or "ice".
 */
const MEANINGS = [
  {
    id: 'juice',
    icon: 'citrus',
    color: 'orange',
    keys: [
      'juice', 'juices', 'fresh juice', 'fresh juices', 'smoothie', 'smoothies',
      'ابمیوه', 'اب میوه', 'ابمیوه تازه', 'اب میوه تازه', 'ابپرتقال', 'اب پرتقال', 'اب سیب', 'اب هویج',
      'عصير', 'عصائر', 'عصير طازج', 'عصائر طازجة', 'عصير فواكه', 'عصير برتقال',
      'شهربت', 'شهربتی', 'شهربتی نوێ', 'اوی میوه', 'ئاوی میوه', 'شهربتی میوه',
    ],
  },
  {
    id: 'coffee',
    icon: 'coffee',
    color: 'copper',
    keys: [
      'coffee', 'coffees', 'espresso', 'cappuccino', 'latte', 'americano', 'mocha',
      'macchiato', 'frappe', 'frappuccino',
      'قهوه', 'قهوه خانه', 'اسپرسو', 'کاپوچینو', 'لاته', 'امریکانو', 'موکا', 'فراپه', 'ماکیاتو',
      'قهوة', 'اسبريسو', 'كابتشينو', 'لاتيه', 'امريكانو', 'موكا', 'فرابيه',
      'قاوه', 'ئیسپرسۆ', 'کاپوچینۆ', 'لاتێ', 'ئەمریکانۆ', 'قاوه‌خانه',
    ],
  },
  {
    id: 'tea',
    icon: 'teaCup',
    color: 'green',
    keys: [
      'tea', 'teas', 'infusion', 'infusions', 'herbal', 'matcha', 'chai',
      'چای', 'چایی', 'دمنوش', 'دمنوش ها', 'چای سبز',
      'شاي', 'شاى', 'اعشاب', 'أعشاب', 'شاي اخضر',
      'چا', 'دەمنووس', 'دمنووس', 'چای سه وز',
    ],
  },
  {
    id: 'iceDrink',
    icon: 'glass',
    color: 'cyan',
    keys: [
      'ice drink', 'ice drinks', 'iced', 'iced coffee', 'iced tea', 'cold brew',
      'نوشیدنی سرد', 'نوشیدنی های سرد', 'نوشیدنی خنک', 'ایس',
      'مشروب بارد', 'مشروبات باردة', 'مشروب مثلج',
      'خواردنەوەی سارد', 'خواردنەوە ساردەکان', 'شهربتی سارد',
    ],
  },
  {
    id: 'coldDrink',
    icon: 'glass',
    color: 'blue',
    keys: [
      'cold drink', 'cold drinks', 'soft drink', 'soft drinks', 'soda', 'lemonade',
      'mocktail', 'cocktail', 'refreshing', 'refreshments',
      'نوشابه', 'لیموناد', 'کوکتل', 'اب سرد', 'نوشیدنی گازدار',
      'مشروبات غازية', 'مشروبات بارده', 'ليموناضه', 'كوكتيل', 'ماء بارد',
      'شهربتی سارد', 'خواردنەوەی گازدار',
    ],
  },
  {
    id: 'iceCream',
    icon: 'iceCream',
    color: 'pink',
    keys: [
      'ice cream', 'icecream', 'ice creams', 'gelato', 'sorbet', 'sundae',
      'بستنی', 'بستنی قیفی', 'بستنی سنتی',
      'ايس كريم', 'ايسكريم', 'بوظة', 'مثلجات', 'جيلاتي',
      'ئایسکریم', 'ئایس کریم', 'به‌ستنی', 'بەستنی',
    ],
  },
  {
    id: 'cake',
    icon: 'cake',
    color: 'rose',
    keys: [
      'cake', 'cakes', 'cheesecake', 'cupcake', 'cupcakes', 'brownie', 'tiramisu',
      'کیک', 'کیک ها', 'چیزکیک', 'کاپ کیک',
      'كيك', 'كيكه', 'كعك', 'تشيز كيك', 'براوني',
      'کێک', 'کێکی', 'کیک', 'چیزکێک',
    ],
  },
  {
    id: 'dessert',
    icon: 'cake',
    color: 'magenta',
    keys: [
      'dessert', 'desserts', 'sweet', 'sweets', 'pudding', 'kunafa', 'baklava',
      'chocolate', 'ice',
      'دسر', 'دسرها', 'شیرینی', 'شیرینی جات', 'حلوا', 'کنافه', 'باقلوا', 'شکلات',
      'حلويات', 'حلوى', 'كنافه', 'بقلاوه', 'شوكولاته', 'مهلبيه',
      'شیرینی', 'شیرینیجات', 'حه لوا', 'کنافه', 'شوکولاته',
    ],
  },
  {
    id: 'waffle',
    icon: 'waffle',
    color: 'amber',
    keys: ['waffle', 'waffles', 'وافل', 'وافل‌ها', 'وافڵ'],
  },
  {
    id: 'pancake',
    icon: 'pancake',
    color: 'amber',
    keys: ['pancake', 'pancakes', 'hotcake', 'hotcakes', 'پنکیک', 'پن کیک', 'بان كيك', 'بانكيك', 'پانکێک', 'په‌نکێک'],
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
      'burger', 'burgers', 'hamburger', 'cheeseburger',
      'برگر', 'همبرگر', 'چیزبرگر', 'برگرها',
      'برجر', 'همبرغر', 'برغر', 'تشيز برجر',
      'به‌رگه‌ر', 'هه‌مبه‌رگه‌ر', 'بەرگەر', 'هەمبەرگەر',
    ],
  },
  {
    id: 'fastFood',
    icon: 'sandwich',
    color: 'tomato',
    keys: [
      'fast food', 'fastfood', 'sandwich', 'sandwiches', 'wrap', 'wraps',
      'shawarma', 'fries', 'fried', 'hot dog', 'snack', 'snacks',
      'فست فود', 'ساندویچ', 'ساندویچ ها', 'شاورما', 'سیب زمینی', 'هات داگ', 'پیش غذا', 'اسنک',
      'وجبات سريعه', 'سندويش', 'سندويشات', 'شاورما', 'بطاطا مقلية', 'هوت دوغ', 'سناكس',
      'فاست فوود', 'ساندویچ', 'شاورما', 'په‌تاته‌ سوورکراوه', 'ئاسنێک',
    ],
  },
  {
    id: 'pizza',
    icon: 'pizza',
    color: 'tomato',
    keys: ['pizza', 'pizzas', 'پیتزا', 'بيتزا', 'پیتزه'],
  },
  {
    id: 'salad',
    icon: 'leaf',
    color: 'emerald',
    keys: [
      'salad', 'salads', 'vegetable', 'vegetables', 'healthy', 'vegan', 'vegetarian',
      'سالاد', 'سبزیجات', 'سبزی', 'گیاهی', 'تره بار',
      'سلطه', 'سلطات', 'خضار', 'نباتي', 'صحي',
      'زه لاته', 'زەڵاتە', 'سالاد', 'سه وزه', 'ڕووه‌ک',
    ],
  },
  {
    id: 'hotDrink',
    icon: 'coffee',
    color: 'copper',
    keys: [
      'hot drink', 'hot drinks', 'hot beverage', 'hot beverages',
      'نوشیدنی گرم', 'نوشیدنی های گرم', 'نوشیدنی داغ',
      'مشروب ساخن', 'مشروبات ساخنة', 'مشروبات ساخنه',
      'خواردنەوەی گەرم', 'خواردنەوەی گه‌رم',
    ],
  },
  {
    id: 'breakfast',
    icon: 'chefHat',
    color: 'amber',
    keys: [
      'breakfast', 'brunch', 'morning', 'omelette', 'omelet', 'eggs',
      'صبحانه', 'املت', 'تخم مرغ', 'بوفه صبحانه',
      'فطور', 'افطار', 'إفطار', 'عجه', 'بيض',
      'به‌یانیان', 'بەیانیان', 'به‌یانی', 'ئۆملێت', 'هێلکه',
    ],
  },
  {
    id: 'mainMeal',
    icon: 'utensils',
    color: 'indigo',
    keys: [
      'main', 'mains', 'main meal', 'main meals', 'main course', 'meal', 'meals',
      'lunch', 'dinner', 'grill', 'grilled', 'kebab', 'steak', 'rice', 'chicken',
      'غذای اصلی', 'غذا', 'غذاها', 'ناهار', 'شام', 'کباب', 'گریل', 'برنج', 'مرغ', 'استیک', 'خوراک',
      'اطباق رئيسيه', 'طبق رئيسي', 'غداء', 'عشاء', 'كباب', 'مشاوي', 'ارز', 'دجاج', 'وجبه',
      'خواردنی سه‌ره‌کی', 'خواردنی سەرەکی', 'نانی نیوه‌ڕۆ', 'نانی ئێواره', 'که‌باب', 'برنج', 'مریشک',
    ],
  },
  {
    id: 'bakery',
    icon: 'bread',
    color: 'copper',
    keys: [
      'bakery', 'bread', 'breads', 'croissant', 'croissants', 'bun', 'buns',
      'toast', 'patisserie', 'dough',
      'نانوایی', 'نان', 'نان ها', 'کروسان', 'شیرینی خشک', 'نان تازه',
      'مخبز', 'خبز', 'كرواسون', 'معجنات', 'توست',
      'نان', 'نانوایی', 'کروسان', 'نانێ تازه',
    ],
  },
  {
    id: 'milkshake',
    icon: 'bottle',
    color: 'violet',
    keys: [
      'milkshake', 'milkshakes', 'milk shake', 'shake', 'shakes',
      'میلک شیک', 'میلک‌شیک', 'شیک', 'میلک',
      'ميلك شيك', 'مخفوق الحليب', 'ميلك',
      'میلکشیک', 'میلک شێک', 'شێک',
    ],
  },
];

/** Folded keywords, computed once. */
const FOLDED = MEANINGS.map((m) => ({ ...m, keys: m.keys.map(foldCategoryName).filter(Boolean) }));

/**
 * Best meaning for a set of localized names.
 * The score is the total length of every keyword found, so a specific phrase
 * ("بستنی" / "ice cream") always outweighs a generic one ("ice").
 */
export function matchCategoryMeaning(names = []) {
  const haystacks = (Array.isArray(names) ? names : [names])
    .map(foldCategoryName)
    .filter(Boolean);
  if (!haystacks.length) return null;

  let best = null;
  let bestScore = 0;
  for (const meaning of FOLDED) {
    let score = 0;
    for (const key of meaning.keys) {
      if (haystacks.some((name) => name.includes(key))) score += key.length;
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
 * First accent around the preferred one that no other category of this business
 * uses yet. Once the whole palette is taken, a stable lighter/darker variant of
 * the preferred accent keeps the new category distinguishable.
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
  return GLYPH_ALIASES[String(icon ?? '').trim()] || GLYPH_ALIASES[String(icon ?? '').toLowerCase()] || FALLBACK_ICON;
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
  sandwich: INK.coral,
  burger: INK.coral,
  pizza: INK.tomato,
  salad: INK.emerald,
  leaf: INK.emerald,
  bread: INK.copper,
  breakfast: INK.amber,
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
 * A name with no confident match keeps a neutral menu glyph (`utensils`) and
 * still receives an accent no other category uses.
 */
export function resolveCategoryAppearance(names, existingCategories = [], options = {}) {
  const meaning = matchCategoryMeaning(names);
  const seed = seedOf(names);
  const color = pickColor(
    meaning?.color || 'indigo',
    usedColors(existingCategories, options.excludeId),
    seed,
  );
  return {
    icon: meaning?.icon || FALLBACK_ICON,
    color,
    meaning: meaning?.id || null,
  };
}
