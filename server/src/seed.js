import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { q, tx } from './db.js';
import { hashPassword } from './auth.js';

const here = path.dirname(url.fileURLToPath(import.meta.url));

export async function migrate() {
  const sql = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
  await q(sql);
}

const WORKING_HOURS = {
  mon: { open: '09:00', close: '23:00', closed: false },
  tue: { open: '09:00', close: '23:00', closed: false },
  wed: { open: '09:00', close: '23:00', closed: false },
  thu: { open: '09:00', close: '23:30', closed: false },
  fri: { open: '14:00', close: '23:59', closed: false },
  sat: { open: '10:00', close: '23:30', closed: false },
  sun: { open: '10:00', close: '22:00', closed: false },
};

const CATEGORIES = [
  ['coffee', 'Coffee', 'قاوە', 'قهوه', 'قهوة', 1],
  ['tea', 'Tea & Infusions', 'چا و دەمنووس', 'چای و دمنوش', 'شاي وأعشاب', 2],
  ['breakfast', 'Breakfast', 'بەیانیان', 'صبحانه', 'فطور', 3],
  ['desserts', 'Desserts', 'شیرینی', 'دسر', 'حلويات', 4],
  ['juice', 'Fresh Juices', 'شەربەتی نوێ', 'آبمیوه تازه', 'عصائر طازجة', 5],
  ['sandwich', 'Sandwiches', 'ساندویچ', 'ساندویچ', 'سندويشات', 6],
];

const PRODUCTS = [
  // category index, price, ku, fa, ar, en  (+ long-name specimens for layout testing)
  [0, 3500, 'ئیسپرێسۆی تایبەت بە ماڵی لیانیان', 'اسپرسو مخصوص خانه لیانیان', 'إسبريسو خاص ببيت ليان', 'Lilyan House Espresso'],
  [0, 4500, 'کاپوچینۆ بە شیری وەرزی و دارچین', 'کاپوچینو با شیر فصلی و دارچین', 'كابتشينو بحليب موسمي وقرفة', 'Seasonal Milk & Cinnamon Cappuccino'],
  [0, 5000, 'لاتێی ساردی وەرزی بە شەربەتی ڤانیلا', 'لاته سرد فصلی با شربت وانیل', 'لاتيه بارد موسمي بشراب الفانيليا', 'Iced Seasonal Latte with Vanilla Syrup'],
  [0, 3000, 'ئەمریکانۆی دووانە', 'آمریکانو دوبل', 'أمريكانو دوبل', 'Double Americano'],
  [1, 2500, 'چای ڕەشی کوردی بە نانەوە', 'چای سیاه کردی با نعنا', 'شاي أسود كردي بالنعناع', 'Kurdish Black Tea with Mint'],
  [1, 3000, 'دەمنووسی گیاوی بە هەنگوین', 'دمنوش گیاهی با عسل', 'شاي أعشاب بالعسل', 'Herbal Infusion with Honey'],
  [2, 9000, 'بەیانیانی تەواو بۆ دوو کەس بە هەموو پێکهاتەکان', 'صبحانه کامل برای دو نفر با تمام مخلفات', 'فطور كامل لشخصين مع جميع الملحقات', 'Full Breakfast Platter for Two Guests'],
  [2, 6500, 'ئۆملێتی پەنیر و سەوزەی تازە', 'املت پنیر و سبزیجات تازه', 'عجة بالجبن والخضار الطازجة', 'Cheese & Fresh Herb Omelette'],
  [2, 5500, 'شیرینمەنی بەیانیان', 'کره و مربای خانگی', 'زبدة ومربى منزلي', 'Butter & Homemade Jam'],
  [3, 6000, 'کێکی چۆکلێتی بە توتەوڵاخی سەرەوە', 'کیک شکلاتی با توت‌فرنگی تازه', 'كيك شوكولاتة بالفراولة الطازجة', 'Chocolate Cake with Fresh Strawberry'],
  [3, 4000, 'کەنەفەی پەنیر', 'کنافه پنیری', 'كنافة بالجبن', 'Cheese Kunafa'],
  [3, 3500, 'بروونی کرمەکەرەمێل', 'براونی کرم کارامل', 'براوني كريم الكراميل', 'Caramel Cream Brownie'],
  [4, 4000, 'شەربەتی پرتەقاڵی نوێ', 'آب پرتقال تازه', 'عصير برتقال طازج', 'Fresh Orange Juice'],
  [4, 5000, 'شەربەتی میوەی تێکەڵ', 'آبمیوه میکس', 'عصير فواكه مشكل', 'Mixed Fruit Juice'],
  [5, 7000, 'ساندویچ مریشکی گرێل بە سۆسی تایبەت', 'ساندویچ مرغ گریل با سس مخصوص', 'سندويش دجاج مشوي بصوص خاص', 'Grilled Chicken Sandwich with Signature Sauce'],
  [5, 8000, 'ساندویچ بێرگری سەوزە', 'ساندویچ برگر سبزیجات', 'سندويش برجر الخضار', 'Veggie Burger Sandwich'],
];

const LONG_REVIEW =
  'The digital menu loaded instantly on my phone and the staff brought our order without any confusion about the table number. We sat outside on the terrace, ordered a full breakfast platter and the house espresso, and everything arrived hot and exactly as described on the screen. The Kurdish and Arabic translations were accurate, which made ordering easy for my family. Will definitely come back on the weekend with more friends.';

/**
 * Seeds one sample business with sample data. Everything it writes is flagged
 * is_sample = true so "Reset Sample Data" can remove it without ever touching
 * the owner account, the business profile or membership rows.
 */
export async function seed() {
  const existing = await q('SELECT id FROM businesses LIMIT 1');
  if (existing.rowCount > 0) {
    await ensureSuperAdmin();
    await reconcileOrderSequence();
    return;
  }

  await tx(async (c) => {
    const owner = await c.query(
      `INSERT INTO users (email, password_hash, full_name, phone, locale, is_super_admin)
       VALUES ($1,$2,$3,$4,'en',false) RETURNING id`,
      ['owner@lilyan.app', hashPassword('lilyan1234'), 'Lilyan Owner', '+964 750 111 2233'],
    );
    const ownerId = owner.rows[0].id;

    const biz = await c.query(
      `INSERT INTO businesses
        (slug, name, name_ku, name_fa, name_ar, name_en, description, phone, email, website,
         address, city, latitude, longitude, socials, business_type, theme, working_hours,
         receipt_settings, notification_settings, menu_settings, editable_text, timezone, is_sample)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17::jsonb,$18::jsonb,
               $19::jsonb,$20::jsonb,$21::jsonb,$22::jsonb,$23,true)
       RETURNING id`,
      [
        'lilyan-pert',
        'Lilyan Pert',
        'لیانیان پێرت',
        'لیلیان پورت',
        'ليليان بيرت',
        'Lilyan Pert',
        'A modern café serving specialty coffee, breakfast and desserts.',
        '+964 750 111 2233',
        'hello@lilyan.app',
        'https://lilyan.app',
        'Salim Street, near the main roundabout',
        'Sulaymaniyah',
        35.5613,
        45.4426,
        JSON.stringify({
          instagram: 'https://instagram.com/lilyanpert',
          facebook: 'https://facebook.com/lilyanpert',
          tiktok: 'https://tiktok.com/@lilyanpert',
          whatsapp: 'https://wa.me/9647501112233',
        }),
        'cafe',
        JSON.stringify({ mode: 'light', preset: 'midnight', primary: '#7C67E4' }),
        JSON.stringify(WORKING_HOURS),
        JSON.stringify({
          show_logo: true,
          show_address: true,
          show_phone: true,
          show_order_info: true,
          show_change_info: true,
          show_cashier: true,
          paper_width: '80mm',
          footer_text: 'Thank you for visiting Lilyan Pert',
        }),
        JSON.stringify({
          sound_enabled: true,
          push_enabled: true,
          new_order: true,
          status_changes: false,
          daily_summary: false,
        }),
        JSON.stringify({
          show_customer_menu: true,
          show_admin_return: true,
          show_prices: true,
          show_images: true,
        }),
        JSON.stringify({
          menu_title: {
            ku: 'مێنیۆی دیجیتاڵ',
            fa: 'منوی دیجیتال',
            ar: 'القائمة الرقمية',
            en: 'Digital Menu',
          },
          welcome: {
            ku: 'بەخێربێن بۆ لیانیان پێرت',
            fa: 'به لیلیان پورت خوش آمدید',
            ar: 'مرحباً بكم في ليليان بيرت',
            en: 'Welcome to Lilyan Pert',
          },
        }),
        'Asia/Baghdad',
      ],
    );
    const businessId = biz.rows[0].id;

    await c.query(
      `INSERT INTO memberships (business_id, user_id, role) VALUES ($1,$2,'owner')`,
      [businessId, ownerId],
    );

    // A manager and a staff member so role-based UI can be exercised.
    const manager = await c.query(
      `INSERT INTO users (email, password_hash, full_name, phone)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      ['manager@lilyan.app', hashPassword('manager1234'), 'Dilan Manager', '+964 750 444 5566'],
    );
    await c.query(
      `INSERT INTO memberships (business_id, user_id, role) VALUES ($1,$2,'manager')`,
      [businessId, manager.rows[0].id],
    );
    const staff = await c.query(
      `INSERT INTO users (email, password_hash, full_name, phone)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      ['staff@lilyan.app', hashPassword('staff1234'), 'Aram Staff', '+964 750 777 8899'],
    );
    await c.query(
      `INSERT INTO memberships (business_id, user_id, role) VALUES ($1,$2,'staff')`,
      [businessId, staff.rows[0].id],
    );

    const categoryIds = [];
    for (const [icon, en, ku, fa, ar, order] of CATEGORIES) {
      const r = await c.query(
        `INSERT INTO categories (business_id, icon, sort_order, active, name_en, name_ku, name_fa, name_ar, is_sample)
         VALUES ($1,$2,$3,true,$4,$5,$6,$7,true) RETURNING id`,
        [businessId, icon, order, en, ku, fa, ar],
      );
      categoryIds.push(r.rows[0].id);
    }

    const productIds = [];
    let sort = 0;
    for (const [ci, price, ku, fa, ar, en] of PRODUCTS) {
      sort += 1;
      const r = await c.query(
        `INSERT INTO products (business_id, category_id, price, active, available, sort_order,
                               name_ku, name_fa, name_ar, name_en, description_en, is_sample)
         VALUES ($1,$2,$3,true,true,$4,$5,$6,$7,$8,$9,true) RETURNING id`,
        [
          businessId,
          categoryIds[ci],
          price,
          sort,
          ku,
          fa,
          ar,
          en,
          `${en} — prepared fresh to order.`,
        ],
      );
      productIds.push({ id: r.rows[0].id, price: Number(price), en, ku });
    }

    // One inactive category + one inactive product inside an active category,
    // so visibility statistics have something real to report.
    await c.query(
      `UPDATE categories SET active = false WHERE id = $1`,
      [categoryIds[5]],
    );

    const tableRows = [];
    for (const [name, seats, zone] of [
      ['Table 1', 4, 'Indoor'],
      ['Table 2', 4, 'Indoor'],
      ['Table 3', 2, 'Window'],
      ['Terrace 1', 6, 'Terrace'],
      ['Terrace 2', 4, 'Terrace'],
    ]) {
      const r = await c.query(
        `INSERT INTO tables (business_id, name, seats, zone, qr_token, is_sample)
         VALUES ($1,$2,$3,$4,$5,true) RETURNING id, name`,
        [businessId, name, seats, zone, `t-${Math.random().toString(36).slice(2, 10)}`],
      );
      tableRows.push(r.rows[0]);
    }

    await c.query(
      `INSERT INTO advertisements (business_id, title_en, title_ku, title_fa, title_ar,
                                   subtitle_en, subtitle_ku, subtitle_fa, subtitle_ar, active, sort_order, is_sample)
       VALUES
        ($1,'Weekend Brunch Offer','پێشکەشکردنی بەیانیانی کۆتایی هەفتە','پیشنهاد صبحانه آخر هفته','عرض فطور نهاية الأسبوع',
            '20% off all breakfast platters, Saturday and Sunday','٢٠٪ داشکاندن','۲۰٪ تخفیف','خصم ٢٠٪',true,1,true),
        ($1,'Fresh Juice Bar','شەربەتی تازە','آبمیوه تازه','عصائر طازجة',
            'Cold pressed every morning','هەموو بەیانیێک','هر روز صبح','طازج كل صباح',true,2,true)`,
      [businessId],
    );

    await c.query(
      `INSERT INTO promotions (business_id, product_id, discount_type, discount_value, active,
                               title_en, title_ku, title_fa, title_ar, is_sample)
       VALUES ($1,$2,'percent',15,true,'Espresso Happy Hour','کاتژمێری خۆش','ساعت شاد','ساعة سعيدة',true)`,
      [businessId, productIds[0].id],
    );

    await c.query(
      `INSERT INTO reviews (business_id, customer_name, rating, comment, status, is_sample)
       VALUES ($1,'Hana',5,$2,'approved',true),
              ($1,'Rezan',4,'Great coffee, quick service at the terrace.','approved',true),
              ($1,'Sara',5,'Loved the desserts.','pending',true)`,
      [businessId, LONG_REVIEW],
    );

    // Sample orders spread across the last week so the dashboard has real numbers.
    const statuses = ['pending', 'preparing', 'ready', 'completed', 'completed', 'cancelled'];
    for (let i = 0; i < 14; i += 1) {
      const status = statuses[i % statuses.length];
      const daysAgo = i % 7;
      const table = tableRows[i % tableRows.length];
      const picked = [
        productIds[i % productIds.length],
        productIds[(i + 3) % productIds.length],
      ];
      const subtotal = picked.reduce(
        (sum, p, idx) => sum + p.price * (idx === 0 ? 2 : 1),
        0,
      );
      const discount = i % 4 === 0 ? Math.round(subtotal * 0.1) : 0;
      const total = subtotal - discount;
      const order = await c.query(
        `INSERT INTO orders (business_id, table_id, order_number, status, channel, customer_name,
                             subtotal, discount, total, created_by, created_at, completed_at, is_sample)
         VALUES ($1,$2,$3,$4,'customer',$5,$6,$7,$8,$9,
                 now() - ($10 || ' days')::interval,
                 CASE WHEN $4 = 'completed' THEN now() - ($10 || ' days')::interval ELSE NULL END, true)
         RETURNING id`,
        [
          businessId,
          table.id,
          1000 + i,
          status,
          i % 3 === 0 ? 'Guest' : null,
          subtotal,
          discount,
          total,
          i % 2 === 0 ? ownerId : staff.rows[0].id,
          String(daysAgo),
        ],
      );
      const orderId = order.rows[0].id;
      for (const [idx, p] of picked.entries()) {
        const qty = idx === 0 ? 2 : 1;
        await c.query(
          `INSERT INTO order_items (order_id, business_id, product_id, name, unit_price, quantity, line_total)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [orderId, businessId, p.id, p.en, p.price, qty, p.price * qty],
        );
      }
      await c.query(
        `INSERT INTO order_status_history (business_id, order_id, from_status, to_status, changed_by_name, changed_at)
         VALUES ($1,$2,NULL,'pending','System', now() - ($3 || ' days')::interval)`,
        [businessId, orderId, String(daysAgo)],
      );
      if (status !== 'pending') {
        await c.query(
          `INSERT INTO order_status_history (business_id, order_id, from_status, to_status, changed_by_name, changed_at)
           VALUES ($1,$2,'pending',$3,'Dilan Manager', now() - ($4 || ' days')::interval + interval '20 minutes')`,
          [businessId, orderId, status, String(daysAgo)],
        );
      }
    }

    // Website views for the analytics cards.
    for (let i = 0; i < 40; i += 1) {
      await c.query(
        `INSERT INTO business_views (business_id, session_key, viewed_on, is_sample)
         VALUES ($1,$2, CURRENT_DATE - ($3)::int, true)
         ON CONFLICT DO NOTHING`,
        [businessId, `seed-${i}`, String(i % 7)],
      );
    }
  });

  await ensureSuperAdmin();
  await reconcileOrderSequence();
}

/**
 * Keeps each business's order counter ahead of the orders that already exist,
 * so a new order can never collide with an older order number.
 */
async function reconcileOrderSequence() {
  await q(
    `UPDATE businesses b
        SET order_seq = GREATEST(
              b.order_seq,
              coalesce((SELECT max(o.order_number) FROM orders o WHERE o.business_id = b.id), b.order_seq)
            )`,
  );
}

async function ensureSuperAdmin() {
  const found = await q(`SELECT id FROM users WHERE is_super_admin = true LIMIT 1`);
  if (found.rowCount > 0) return;
  await q(
    `INSERT INTO users (email, password_hash, full_name, is_super_admin)
     VALUES ($1,$2,$3,true)
     ON CONFLICT (email) DO UPDATE SET is_super_admin = true`,
    ['admin@lilyan.app', hashPassword('superadmin1234'), 'Platform Super Admin'],
  );
}
