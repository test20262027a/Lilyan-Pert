/*
 * Category icon & colour catalogue for the Add / Edit Category pickers.
 *
 * Every `key` below is an `Icon` glyph (see Icon.jsx + categoryGlyphs.jsx), so
 * the picker can never render a broken icon. The `terms` are search words in
 * English, Persian, Arabic and Kurdish Sorani; the visible label is localised
 * through `label` (en/fa/ar/ku).
 *
 * `categoryGlyph()` in categoryIcons.js accepts every key listed here, which is
 * what lets a picked glyph be saved on the existing `icon` column and read back
 * by the admin list, the heading and the customer category bar unchanged.
 */

/* label = [en, ku, fa, ar]; terms = extra search words (any language). */
const g = (key, en, ku, fa, ar, terms = '') => ({ key, label: { en, ku, fa, ar }, terms });

export const ICON_GROUPS = [
  {
    id: 'hot',
    label: { en: 'Coffee & Hot Drinks', ku: 'قاوە و خواردنەوەی گەرم', fa: 'قهوه و نوشیدنی گرم', ar: 'القهوة والمشروبات الساخنة' },
    icons: [
      g('coffee', 'Coffee cup', 'کوپی قاوە', 'فنجان قهوه', 'فنجان قهوة', 'coffee cafe قهوه قاوه قهوة کافه latte cappuccino'),
      g('espresso', 'Espresso', 'ئیسپرسۆ', 'اسپرسو', 'إسبريسو', 'espresso اسپرسو إسبريسو ئیسپرسۆ'),
      g('coffeeTogo', 'Coffee to go', 'قاوەی گەشت', 'قهوه همراه', 'قهوة للذهاب', 'takeaway togo takeout coffee'),
      g('teaCup', 'Tea', 'چا', 'چای', 'شاي', 'tea chai چای شاي چا دمنوش'),
      g('teapot', 'Teapot', 'چادان', 'قوری', 'إبريق شاي', 'teapot قوری چادان إبريق'),
      g('hotChocolate', 'Hot chocolate', 'شۆکۆلاتەی گەرم', 'شکلات داغ', 'شوكولاتة ساخنة', 'hot chocolate cocoa کاکائو شکلات داغ'),
      g('mug', 'Mug', 'مەگ', 'ماگ', 'كوب', 'mug cup ماگ كوب'),
      g('kettle', 'Kettle', 'کێتڵ', 'کتری', 'غلاية', 'kettle کتری غلاية'),
      g('coffeeBean', 'Coffee beans', 'دانەی قاوە', 'دانه قهوه', 'حبوب القهوة', 'beans roast دانه قهوه حبوب'),
    ],
  },
  {
    id: 'cold',
    label: { en: 'Cold Drinks & Juices', ku: 'خواردنەوەی سارد و شەربەت', fa: 'نوشیدنی سرد و آبمیوه', ar: 'المشروبات الباردة والعصائر' },
    icons: [
      g('glass', 'Drinking glass', 'پەرداخ', 'لیوان', 'كوب زجاجي', 'glass water cold drink لیوان پەرداخ نوشیدنی سرد ئاو'),
      g('cupSoda', 'Soft drink', 'خواردنەوەی گازدار', 'نوشابه', 'مشروب غازي', 'soda cola soft drink نوشابه گازدار'),
      g('citrus', 'Juice', 'شەربەت', 'آبمیوه', 'عصير', 'juice fresh آبمیوه عصير شەربەت شهربت'),
      g('lemon', 'Lemon', 'لیمۆ', 'لیمو', 'ليمون', 'lemon lemonade لیمو ليمون لیمۆ لیموناد'),
      g('orange', 'Orange', 'پرتەقاڵ', 'پرتقال', 'برتقال', 'orange پرتقال برتقال پرتەقاڵ'),
      g('cocktail', 'Cocktail', 'کۆکتێل', 'کوکتل', 'كوكتيل', 'cocktail mocktail کوکتل كوكتيل'),
      g('martini', 'Martini glass', 'پەرداخی مارتینی', 'جام مارتینی', 'كأس مارتيني', 'martini bar'),
      g('wineGlass', 'Wine glass', 'جامی شەراب', 'جام', 'كأس', 'wine goblet جام كأس'),
      g('smoothie', 'Smoothie', 'سموزی', 'اسموتی', 'سموثي', 'smoothie اسموتی سموثي shake'),
      g('bottle', 'Milkshake', 'میلکشێک', 'میلک شیک', 'ميلك شيك', 'milkshake shake milk bottle میلک شیک شێک شیر حليب'),
      g('juiceBox', 'Juice box', 'سندوقی شەربەت', 'پاکت آبمیوه', 'علبة عصير', 'juice box carton'),
      g('waterBottle', 'Water bottle', 'بتڵی ئاو', 'بطری آب', 'زجاجة ماء', 'water bottle آب ماء ئاو بطری'),
      g('iceCubes', 'Ice cubes', 'سەهۆڵ', 'یخ', 'مكعبات ثلج', 'ice cubes cold یخ ثلج سەهۆڵ'),
      g('beer', 'Beer mug', 'کوپی بیرە', 'لیوان آبجو', 'كوب بيرة', 'beer mug'),
      g('drop', 'Water drop', 'دلۆپ', 'قطره', 'قطرة', 'drop water liquid قطره قطرة'),
      g('snowflake', 'Frozen', 'سەهۆڵ', 'یخ‌زده', 'مجمد', 'frozen snow cold ice یخ ثلج سەهۆڵ'),
    ],
  },
  {
    id: 'fast',
    label: { en: 'Fast Food', ku: 'خواردنی خێرا', fa: 'فست‌فود', ar: 'الوجبات السريعة' },
    icons: [
      g('pizza', 'Pizza', 'پیتزا', 'پیتزا', 'بيتزا', 'pizza پیتزا بيتزا پیزا italian'),
      g('hamburger', 'Hamburger', 'هەمبەرگەر', 'همبرگر', 'همبرغر', 'hamburger burger برگر همبرگر برجر بەرگەر'),
      g('sandwich', 'Sandwich', 'ساندویچ', 'ساندویچ', 'ساندويش', 'sandwich ساندویچ سندويش sub'),
      g('hotdog', 'Hot dog', 'هۆت دۆگ', 'هات داگ', 'هوت دوغ', 'hot dog sausage هات داگ هوت دوغ'),
      g('fries', 'French fries', 'پەتاتەی سورکراوە', 'سیب‌زمینی سرخ‌شده', 'بطاطا مقلية', 'fries chips سیب زمینی بطاطا پەتاتە'),
      g('taco', 'Taco', 'تاکۆ', 'تاکو', 'تاكو', 'taco mexican تاکو تاكو'),
      g('burrito', 'Wrap', 'ڕاپ', 'رپ', 'راب', 'wrap burrito shawarma شاورما رپ لفة'),
      g('drumstick', 'Chicken', 'مریشک', 'مرغ', 'دجاج', 'chicken drumstick fried مرغ دجاج مریشک'),
      g('nuggets', 'Nuggets', 'ناگێتس', 'ناگت', 'ناجتس', 'nuggets chicken ناگت'),
      g('package', 'Snack box', 'سندوقی خواردن', 'اسنک', 'سناك', 'snack box package اسنک سناك'),
    ],
  },
  {
    id: 'bakery',
    label: { en: 'Bakery & Desserts', ku: 'نانەواخانە و شیرینی', fa: 'نانوایی و دسر', ar: 'المخبوزات والحلويات' },
    icons: [
      g('cake', 'Cake', 'کێک', 'کیک', 'كيك', 'cake کیک كيك کێک dessert'),
      g('birthdayCake', 'Birthday cake', 'کێکی ڕۆژی لەدایکبوون', 'کیک تولد', 'كيكة عيد ميلاد', 'birthday cake party تولد عيد ميلاد'),
      g('cupcake', 'Cupcake', 'کەپکەیک', 'کاپ کیک', 'كب كيك', 'cupcake کاپ کیک كب كيك'),
      g('muffin', 'Muffin', 'مافن', 'مافین', 'مافن', 'muffin مافین مافن'),
      g('cookie', 'Cookie', 'کوکی', 'کوکی', 'كوكيز', 'cookie biscuit کوکی كوكيز بسکویت'),
      g('donut', 'Donut', 'دۆناتس', 'دونات', 'دونات', 'donut doughnut دونات'),
      g('croissant', 'Croissant', 'کرواسان', 'کروسان', 'كرواسون', 'croissant کروسان کرواسان كرواسون'),
      g('bread', 'Bread', 'نان', 'نان', 'خبز', 'bread bakery نان خبز نانەواخانە'),
      g('bagel', 'Bagel', 'بەیگڵ', 'بیگل', 'بيغل', 'bagel بیگل'),
      g('wheat', 'Wheat', 'گەنم', 'گندم', 'قمح', 'wheat grain گندم قمح گەنم'),
      g('iceCream', 'Ice cream', 'بەستەنی', 'بستنی', 'آيس كريم', 'ice cream gelato بستنی آيس كريم بەستەنی مثلجات'),
      g('candy', 'Candy', 'شیرینی', 'آبنبات', 'حلوى', 'candy sweet آبنبات حلوى شیرینی'),
      g('lollipop', 'Lollipop', 'لۆلیپۆپ', 'آبنبات چوبی', 'مصاصة', 'lollipop sweet'),
      g('chocolate', 'Chocolate', 'شۆکۆلاتە', 'شکلات', 'شوكولاتة', 'chocolate شکلات شوكولاتة شۆکۆلاتە'),
      g('pie', 'Pie', 'پای', 'پای', 'فطيرة', 'pie tart پای فطيرة'),
      g('waffle', 'Waffle', 'وافڵ', 'وافل', 'وافل', 'waffle وافل'),
      g('pancake', 'Pancake', 'پان کەیک', 'پنکیک', 'بان كيك', 'pancake crepe پنکیک بان كيك کرپ'),
      g('honey', 'Honey', 'هەنگوین', 'عسل', 'عسل', 'honey عسل هەنگوین'),
    ],
  },
  {
    id: 'meals',
    label: { en: 'Breakfast & Restaurant', ku: 'نانی بەیانی و چێشتخانە', fa: 'صبحانه و رستوران', ar: 'الفطور والمطعم' },
    icons: [
      g('eggFried', 'Breakfast', 'نانی بەیانی', 'صبحانه', 'فطور', 'breakfast brunch fried egg صبحانه فطور بەیانی'),
      g('egg', 'Egg', 'هێلکە', 'تخم‌مرغ', 'بيض', 'egg تخم مرغ بيض هێلکە'),
      g('soup', 'Soup', 'شۆربا', 'سوپ', 'شوربة', 'soup سوپ شوربة شۆربا'),
      g('salad', 'Salad', 'زەڵاتە', 'سالاد', 'سلطة', 'salad bowl سالاد سلطة زەڵاتە'),
      g('noodles', 'Noodles', 'نۆدڵز', 'نودل', 'نودلز', 'noodles pasta ramen نودل معكرونة پاستا'),
      g('bowlRice', 'Rice bowl', 'برنج', 'کاسه برنج', 'طبق أرز', 'rice bowl برنج أرز ڕیز'),
      g('steak', 'Steak', 'ستەیک', 'استیک', 'ستيك', 'steak meat grill استیک ستيك گۆشت'),
      g('fish', 'Fish', 'ماسی', 'ماهی', 'سمك', 'fish seafood ماهی سمك ماسی'),
      g('shrimp', 'Shrimp', 'میگۆ', 'میگو', 'جمبري', 'shrimp prawn seafood میگو جمبري'),
      g('sushi', 'Sushi', 'سوشی', 'سوشی', 'سوشي', 'sushi japanese سوشی سوشي'),
      g('bbq', 'Grill / BBQ', 'گریل', 'کباب', 'مشاوي', 'grill bbq kebab کباب مشاوي گریل کەباب'),
      g('flame', 'Flame', 'ئاگر', 'شعله', 'لهب', 'flame fire hot spicy آتش شعله ئاگر'),
      g('utensils', 'Restaurant utensils', 'قاپ و چەنگاڵ', 'کارد و چنگال', 'شوكة وسكين', 'restaurant utensils fork knife main meal غذا رستوران مطعم'),
      g('knifeFork', 'Knife & fork', 'کارد و چەتاڵ', 'چنگال و کارد', 'سكين وشوكة', 'knife fork dining'),
      g('spoon', 'Spoon', 'کەوچک', 'قاشق', 'ملعقة', 'spoon قاشق ملعقة کەوچک'),
      g('plate', 'Plate', 'پلێت', 'بشقاب', 'صحن', 'plate dish بشقاب صحن'),
      g('cloche', 'Serving dome', 'سەرپۆشی خواردن', 'سرپوش غذا', 'غطاء التقديم', 'cloche dome serving'),
      g('chefHat', 'Chef hat', 'کڵاوی چێشتلێنەر', 'کلاه سرآشپز', 'قبعة الطاهي', 'chef hat cook سرآشپز طاهي'),
      g('cookingPot', 'Cooking pot', 'قاپی چێشت', 'قابلمه', 'قدر', 'pot cooking قابلمه قدر'),
      g('fryingPan', 'Frying pan', 'تاوە', 'تابه', 'مقلاة', 'pan frying تابه مقلاة تاوە'),
      g('menuBook', 'Menu', 'مینیو', 'منو', 'قائمة', 'menu list منو قائمة مینیو'),
    ],
  },
  {
    id: 'produce',
    label: { en: 'Fruits & Vegetables', ku: 'میوە و سەوزە', fa: 'میوه و سبزیجات', ar: 'الفواكه والخضروات' },
    icons: [
      g('apple', 'Apple', 'سێو', 'سیب', 'تفاح', 'apple fruit سیب تفاح سێو'),
      g('banana', 'Banana', 'مووز', 'موز', 'موز', 'banana موز مووز'),
      g('cherry', 'Cherry', 'گێلاس', 'گیلاس', 'كرز', 'cherry گیلاس كرز گێلاس'),
      g('grapes', 'Grapes', 'ترێ', 'انگور', 'عنب', 'grape grapes انگور عنب ترێ'),
      g('strawberry', 'Strawberry', 'فراولە', 'توت‌فرنگی', 'فراولة', 'strawberry توت فرنگی فراولة فراولە'),
      g('watermelon', 'Watermelon', 'شووتی', 'هندوانه', 'بطيخ', 'watermelon هندوانه بطيخ شووتی'),
      g('pineapple', 'Pineapple', 'ئەناناس', 'آناناس', 'أناناس', 'pineapple آناناس أناناس'),
      g('peach', 'Peach', 'هەوخ', 'هلو', 'خوخ', 'peach هلو خوخ'),
      g('avocado', 'Avocado', 'ئەڤۆکادۆ', 'آووکادو', 'أفوكادو', 'avocado آووکادو'),
      g('carrot', 'Carrot', 'گەزەر', 'هویج', 'جزر', 'carrot هویج جزر گەزەر'),
      g('corn', 'Corn', 'گەنمەشامی', 'ذرت', 'ذرة', 'corn ذرت ذرة گەنمەشامی'),
      g('pepper', 'Pepper', 'بیبەر', 'فلفل', 'فلفل', 'pepper chili فلفل بیبەر'),
      g('mushroom', 'Mushroom', 'قارچک', 'قارچ', 'فطر', 'mushroom قارچ فطر'),
      g('nut', 'Nuts', 'گوێز', 'آجیل', 'مكسرات', 'nuts almond آجیل مكسرات'),
      g('herb', 'Herbs', 'گیاو', 'سبزی', 'أعشاب', 'herb herbs سبزی أعشاب'),
      g('leaf', 'Leaf', 'گەڵا', 'برگ', 'ورقة', 'leaf healthy vegan برگ ورقة گەڵا سالاد'),
      g('leafHeart', 'Healthy', 'تەندروست', 'سالم', 'صحي', 'healthy diet organic سالم صحي'),
    ],
  },
  {
    id: 'shop',
    label: { en: 'Shopping & Services', ku: 'کڕین و خزمەتگوزاری', fa: 'خرید و خدمات', ar: 'التسوق والخدمات' },
    icons: [
      g('cart', 'Shopping cart', 'سەبەتەی کڕین', 'سبد خرید', 'عربة التسوق', 'cart shopping سبد خرید عربة سەبەتە'),
      g('shoppingBag', 'Shopping bag', 'جانتای کڕین', 'کیسه خرید', 'حقيبة تسوق', 'bag shopping کیسه حقيبة'),
      g('gift', 'Gift', 'دیاری', 'هدیه', 'هدية', 'gift present هدیه هدية دیاری'),
      g('box', 'Package', 'پاکێت', 'بسته', 'طرد', 'package box parcel بسته طرد'),
      g('store', 'Store', 'فرۆشگا', 'فروشگاه', 'متجر', 'store shop فروشگاه متجر فرۆشگا'),
      g('tag', 'Tag', 'تاگ', 'برچسب', 'وسم', 'tag label price برچسب'),
      g('percentTag', 'Discount', 'داشکاندن', 'تخفیف', 'خصم', 'discount sale offer تخفیف خصم داشکاندن'),
      g('delivery', 'Delivery', 'گەیاندن', 'تحویل', 'توصيل', 'delivery تحویل توصيل گەیاندن'),
      g('scooter', 'Scooter delivery', 'گەیاندن بە سکووتەر', 'پیک موتوری', 'توصيل بالدراجة', 'scooter motorbike courier'),
      g('truck', 'Truck', 'ترۆک', 'کامیون', 'شاحنة', 'truck cargo کامیون شاحنة'),
      g('creditCard', 'Payment', 'پارەدان', 'پرداخت', 'دفع', 'payment card پرداخت دفع'),
      g('receipt2', 'Receipt', 'وەسڵ', 'رسید', 'إيصال', 'receipt bill رسید إيصال'),
      g('banknote', 'Cash', 'کاش', 'نقد', 'نقد', 'cash money نقد'),
      g('wallet', 'Wallet', 'جزدان', 'کیف پول', 'محفظة', 'wallet کیف پول محفظة'),
    ],
  },
  {
    id: 'general',
    label: { en: 'General', ku: 'گشتی', fa: 'عمومی', ar: 'عام' },
    icons: [
      g('star', 'Star', 'ئەستێرە', 'ستاره', 'نجمة', 'star favorite ستاره نجمة'),
      g('heart', 'Heart', 'دڵ', 'قلب', 'قلب', 'heart love favorite قلب'),
      g('sparkles', 'Sparkles', 'درەوشانەوە', 'درخشش', 'لمعان', 'sparkles new special جدید'),
      g('flower', 'Flower', 'گوڵ', 'گل', 'زهرة', 'flower گل زهرة گوڵ'),
      g('sun', 'Sun', 'خۆر', 'خورشید', 'شمس', 'sun summer خورشید شمس'),
      g('moon', 'Moon', 'مانگ', 'ماه', 'قمر', 'moon night ماه قمر مانگ'),
      g('cloud', 'Cloud', 'هەور', 'ابر', 'سحابة', 'cloud ابر'),
      g('bolt', 'Lightning', 'بروسکە', 'رعد', 'برق', 'bolt energy fast رعد برق'),
      g('gem', 'Premium', 'پریمیۆم', 'ویژه', 'مميز', 'gem premium vip diamond ویژه مميز'),
      g('crown', 'Crown', 'تاج', 'تاج', 'تاج', 'crown king vip تاج'),
      g('trophy', 'Best seller', 'باشترین', 'پرفروش', 'الأكثر مبيعا', 'trophy best seller winner پرفروش'),
      g('party', 'Party', 'ئاهەنگ', 'جشن', 'حفلة', 'party celebration جشن حفلة ئاهەنگ'),
      g('music', 'Music', 'مۆسیقا', 'موسیقی', 'موسيقى', 'music موسیقی موسيقى'),
      g('family', 'Family', 'خێزان', 'خانواده', 'عائلة', 'family kids خانواده عائلة'),
      g('baby', 'Kids', 'منداڵان', 'کودکان', 'أطفال', 'kids baby child کودک أطفال'),
      g('umbrella', 'Umbrella', 'چەتر', 'چتر', 'مظلة', 'umbrella چتر'),
      g('home', 'Home', 'ماڵ', 'خانه', 'منزل', 'home house خانه منزل'),
      g('grid', 'Grid', 'تۆڕ', 'شبکه', 'شبكة', 'grid all'),
      g('layers', 'Layers', 'چین', 'لایه', 'طبقات', 'layers mixed'),
      g('shapes', 'Shapes', 'شێوەکان', 'شکل‌ها', 'أشكال', 'shapes other misc'),
      g('hash', 'Hashtag', 'هاشتاگ', 'هشتگ', 'وسم', 'hash number'),
    ],
  },
];

/** Every selectable glyph key, flattened. */
export const ICON_KEYS = ICON_GROUPS.flatMap((group) => group.icons.map((icon) => icon.key));

export const ICON_COUNT = new Set(ICON_KEYS).size;

const BY_KEY = new Map();
ICON_GROUPS.forEach((group) => group.icons.forEach((icon) => BY_KEY.set(icon.key, icon)));

/** The catalogue entry for a glyph key (or null for a legacy / unknown key). */
export const iconEntry = (key) => BY_KEY.get(key) || null;

/** Localised label of a glyph; falls back to the key itself. */
export function iconLabel(key, locale) {
  const entry = BY_KEY.get(key);
  return entry ? entry.label[locale] || entry.label.en : String(key || '');
}

/** Localised label of a group. */
export const groupLabel = (group, locale) => group.label[locale] || group.label.en;

/* ------------------------------------------------------------ searching -- */

const fold = (text) =>
  String(text ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640\u200c\u200d]/g, '')
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

const HAYSTACKS = new Map(
  ICON_KEYS.map((key) => {
    const entry = BY_KEY.get(key);
    return [key, fold(`${key} ${Object.values(entry.label).join(' ')} ${entry.terms}`)];
  }),
);

/** Groups filtered by a free-text query (any of the four languages). */
export function searchIconGroups(query) {
  const needle = fold(query).trim();
  if (!needle) return ICON_GROUPS;
  const parts = needle.split(/\s+/);
  return ICON_GROUPS.map((group) => ({
    ...group,
    icons: group.icons.filter((icon) => {
      const hay = HAYSTACKS.get(icon.key) || '';
      return parts.every((part) => hay.includes(part));
    }),
  })).filter((group) => group.icons.length);
}

/* --------------------------------------------------------------- colours -- */

/* [hex, en, ku, fa, ar]. 40 shades across the families asked for. */
export const COLOR_PALETTE = [
  ['#ef4444', 'Red', 'سوور', 'قرمز', 'أحمر'],
  ['#dc2626', 'Crimson', 'سووری تۆخ', 'قرمز تیره', 'قرمزي'],
  ['#b91c1c', 'Dark red', 'سووری قووڵ', 'قرمز سیر', 'أحمر داكن'],
  ['#cf3a26', 'Tomato', 'تەماتە', 'گوجه‌ای', 'طماطمي'],
  ['#f97316', 'Orange', 'پرتەقاڵی', 'نارنجی', 'برتقالي'],
  ['#ea7317', 'Tangerine', 'نارنجی', 'نارنگی', 'يوسفي'],
  ['#c2410c', 'Burnt orange', 'پرتەقاڵی سووتاو', 'نارنجی سوخته', 'برتقالي محروق'],
  ['#f59e0b', 'Amber', 'کەهرەبایی', 'کهربایی', 'عنبري'],
  ['#d19407', 'Gold', 'زیڕین', 'طلایی', 'ذهبي'],
  ['#eab308', 'Yellow', 'زەرد', 'زرد', 'أصفر'],
  ['#79a80d', 'Lime', 'لایم', 'لیمویی', 'ليموني'],
  ['#84cc16', 'Light green', 'سەوزی کراوە', 'سبز روشن', 'أخضر فاتح'],
  ['#22c55e', 'Green', 'سەوز', 'سبز', 'أخضر'],
  ['#2f9e5c', 'Leaf green', 'سەوزی گەڵا', 'سبز برگی', 'أخضر ورقي'],
  ['#15803d', 'Forest', 'دارستان', 'سبز جنگلی', 'أخضر غابي'],
  ['#10b981', 'Mint', 'نەعنا', 'نعنایی', 'نعناعي'],
  ['#0f9d76', 'Emerald', 'زمرد', 'زمردی', 'زمردي'],
  ['#14b8a6', 'Turquoise', 'فیرۆزە', 'فیروزه‌ای', 'فيروزي'],
  ['#0d8f92', 'Teal', 'تیل', 'سبزآبی', 'أزرق مخضر'],
  ['#06b6d4', 'Cyan', 'سیان', 'فیروزه‌ای روشن', 'سماوي'],
  ['#0a8fc4', 'Sky blue', 'شینی ئاسمان', 'آبی آسمانی', 'أزرق سماوي'],
  ['#0ea5e9', 'Ocean', 'زەریا', 'اقیانوسی', 'محيطي'],
  ['#3b82f6', 'Blue', 'شین', 'آبی', 'أزرق'],
  ['#2563eb', 'Royal blue', 'شینی شاهانە', 'آبی سلطنتی', 'أزرق ملكي'],
  ['#1e40af', 'Navy', 'شینی تۆخ', 'سرمه‌ای', 'كحلي'],
  ['#1e3a5f', 'Midnight navy', 'شینی نیوەشەو', 'سرمه‌ای تیره', 'كحلي داكن'],
  ['#4f46e5', 'Indigo', 'ئیندیگۆ', 'نیلی', 'نيلي'],
  ['#7c5cf0', 'Violet', 'بنەوشەیی', 'بنفش', 'بنفسجي'],
  ['#8b5cf6', 'Purple', 'مۆر', 'ارغوانی', 'أرجواني'],
  ['#6d28d9', 'Deep purple', 'مۆری قووڵ', 'بنفش تیره', 'أرجواني داكن'],
  ['#b426c9', 'Magenta', 'ماجێنتا', 'سرخابی', 'ماجنتا'],
  ['#d946ef', 'Orchid', 'ئۆرکید', 'ارکیده', 'أوركيد'],
  ['#ec4899', 'Pink', 'پەمبەیی', 'صورتی', 'وردي'],
  ['#e04c7c', 'Raspberry', 'تووی سوور', 'تمشکی', 'توتي'],
  ['#d1478f', 'Rose', 'گوڵەباخ', 'رز', 'وردي غامق'],
  ['#f43f5e', 'Coral rose', 'مرجانی', 'مرجانی', 'مرجاني'],
  ['#a3602f', 'Copper', 'مس', 'مسی', 'نحاسي'],
  ['#92400e', 'Brown', 'قاوەیی', 'قهوه‌ای', 'بني'],
  ['#64748b', 'Slate gray', 'خۆڵەمێشی', 'خاکستری', 'رمادي'],
  ['#475569', 'Charcoal', 'خەڵووز', 'زغالی', 'فحمي'],
].map(([hex, en, ku, fa, ar]) => ({ hex, label: { en, ku, fa, ar } }));

const COLOR_BY_HEX = new Map(COLOR_PALETTE.map((c) => [c.hex.toLowerCase(), c]));

/** The named palette entry for a hex value (null for a custom colour). */
export const colorEntry = (hex) => COLOR_BY_HEX.get(String(hex ?? '').toLowerCase()) || null;

export const colorLabel = (hex, locale) => {
  const entry = colorEntry(hex);
  return entry ? entry.label[locale] || entry.label.en : String(hex || '').toUpperCase();
};

/** `#rgb` / `#rrggbb` (with or without #) → `#rrggbb`, or null when invalid. */
export function normalizeHex(value) {
  let v = String(value ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(v)) v = v.split('').map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/i.test(v) ? `#${v.toLowerCase()}` : null;
}
