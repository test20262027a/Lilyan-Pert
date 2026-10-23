-- Lilyan Pert (QR Menu Pro) — canonical schema.
-- Every business-owned table carries business_id so tenant isolation can be enforced in SQL.

CREATE TABLE IF NOT EXISTS users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text UNIQUE NOT NULL,
  password_hash  text NOT NULL,
  full_name      text,
  phone          text,
  is_super_admin boolean NOT NULL DEFAULT false,
  locale         text NOT NULL DEFAULT 'en',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Profile appearance. The photo is a reference to an uploaded media row and is
-- always shown in preference to the fallback avatar; `avatar_type` keeps the
-- administrator's choice even while a photo is set. Additive: accounts created
-- before this have no photo and the neutral `default` avatar.
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_type text NOT NULL DEFAULT 'default';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_avatar_type_check;
ALTER TABLE users ADD CONSTRAINT users_avatar_type_check
  CHECK (avatar_type IN ('default', 'male', 'female'));

CREATE TABLE IF NOT EXISTS businesses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  name          text NOT NULL,
  name_ku       text, name_fa text, name_ar text, name_en text,
  description   text,
  logo_url      text,
  cover_url     text,
  phone         text,
  email         text,
  website       text,
  address       text,
  addresses     jsonb NOT NULL DEFAULT '{}'::jsonb,
  city          text,
  latitude      double precision,
  longitude     double precision,
  socials       jsonb NOT NULL DEFAULT '{}'::jsonb,
  business_type text NOT NULL DEFAULT 'cafe',
  theme         jsonb NOT NULL DEFAULT '{"mode":"light","preset":"midnight","primary":"#7C67E4"}'::jsonb,
  working_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  receipt_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  notification_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  dashboard_settings jsonb NOT NULL DEFAULT '{"show_overview":true,"show_insights":true,"show_order_notifications":true,"show_recent_orders":true,"show_notification_settings":true}'::jsonb,
  menu_settings jsonb NOT NULL DEFAULT '{"show_customer_menu":true,"show_admin_return":true}'::jsonb,
  editable_text jsonb NOT NULL DEFAULT '{}'::jsonb,
  timezone      text NOT NULL DEFAULT 'Asia/Baghdad',
  currency      text NOT NULL DEFAULT 'IQD',
  tax_rate      numeric(6,3) NOT NULL DEFAULT 0,
  service_charge_rate numeric(6,3) NOT NULL DEFAULT 0,
  order_seq     integer NOT NULL DEFAULT 1000,
  is_sample     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('owner','manager','staff','customer')),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  -- Explicit module permissions ({ "orders.view": true, … }). NULL means "use
  -- the role template", so every account created before this column existed
  -- keeps exactly the access its role already granted.
  permissions jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS permissions jsonb;
-- Sample/demo staff memberships. The demo seed flags the members it creates, so
-- "Reset Sample Data" can remove exactly those; a membership created through
-- User Management is never flagged and is therefore never part of a reset.
-- The owner membership is always excluded by the reset itself, whatever the flag.
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS memberships_user_idx ON memberships(user_id);
CREATE INDEX IF NOT EXISTS memberships_business_idx ON memberships(business_id);

CREATE TABLE IF NOT EXISTS categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  icon        text NOT NULL DEFAULT 'utensils',
  sort_order  integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  name_ku     text, name_fa text, name_ar text, name_en text,
  is_sample   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS categories_business_idx ON categories(business_id);

-- A category's identity colour, saved with its glyph so the same row keeps the
-- same accent on every load and in every view (rows without one fall back to a
-- stable accent derived from the icon key).
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon_color text
  CHECK (icon_color IS NULL OR icon_color ~ '^#[0-9a-fA-F]{6}$');

CREATE TABLE IF NOT EXISTS products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id  uuid REFERENCES categories(id) ON DELETE SET NULL,
  price        numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  image_url    text,
  active       boolean NOT NULL DEFAULT true,
  available    boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  name_ku      text, name_fa text, name_ar text, name_en text,
  description_ku text, description_fa text, description_ar text, description_en text,
  is_sample    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_business_idx ON products(business_id);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);

CREATE TABLE IF NOT EXISTS tables (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        text NOT NULL,
  seats       integer NOT NULL DEFAULT 4,
  qr_token    text UNIQUE NOT NULL,
  zone        text,
  active      boolean NOT NULL DEFAULT true,
  is_sample   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tables_business_idx ON tables(business_id);

CREATE TABLE IF NOT EXISTS orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  table_id       uuid REFERENCES tables(id) ON DELETE SET NULL,
  order_number   integer NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','preparing','ready','completed','cancelled')),
  channel        text NOT NULL DEFAULT 'customer' CHECK (channel IN ('customer','staff')),
  customer_name  text,
  customer_phone text,
  notes          text,
  subtotal       numeric(12,2) NOT NULL DEFAULT 0,
  discount       numeric(12,2) NOT NULL DEFAULT 0,
  tax            numeric(12,2) NOT NULL DEFAULT 0,
  service_charge numeric(12,2) NOT NULL DEFAULT 0,
  total          numeric(12,2) NOT NULL DEFAULT 0,
  promotion_id   uuid,
  created_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  is_sample      boolean NOT NULL DEFAULT false,
  UNIQUE (business_id, order_number)
);
CREATE INDEX IF NOT EXISTS orders_business_created_idx ON orders(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_business_status_idx ON orders(business_id, status);

-- Historical snapshot of what was actually ordered: names/prices are frozen at order time.
CREATE TABLE IF NOT EXISTS order_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id  uuid REFERENCES products(id) ON DELETE SET NULL,
  name        text NOT NULL,
  unit_price  numeric(12,2) NOT NULL DEFAULT 0,
  quantity    integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  line_total  numeric(12,2) NOT NULL DEFAULT 0,
  notes       text
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);

-- Append-only audit of real status changes.
CREATE TABLE IF NOT EXISTS order_status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status text,
  to_status   text NOT NULL,
  changed_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_by_name text,
  changed_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS osh_order_idx ON order_status_history(order_id, changed_at);

-- Append-only audit of "user pressed Print" events (not proof of physical printing).
CREATE TABLE IF NOT EXISTS receipt_prints (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  printed_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  printed_by_name text,
  printed_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS receipt_prints_order_idx ON receipt_prints(order_id, printed_at);

CREATE TABLE IF NOT EXISTS reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id      uuid REFERENCES orders(id) ON DELETE SET NULL,
  customer_name text,
  rating        integer NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment       text,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  is_sample     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_business_idx ON reviews(business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS advertisements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  image_url     text,
  link_url      text,
  category_id   uuid REFERENCES categories(id) ON DELETE SET NULL,
  product_id    uuid REFERENCES products(id) ON DELETE SET NULL,
  title_ku      text, title_fa text, title_ar text, title_en text,
  subtitle_ku   text, subtitle_fa text, subtitle_ar text, subtitle_en text,
  starts_at     timestamptz,
  ends_at       timestamptz,
  placement     text NOT NULL DEFAULT 'below_header',
  active        boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  is_sample     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ads_business_idx ON advertisements(business_id);

CREATE TABLE IF NOT EXISTS promotions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id     uuid REFERENCES products(id) ON DELETE CASCADE,
  discount_type  text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  starts_at      timestamptz,
  ends_at        timestamptz,
  active         boolean NOT NULL DEFAULT true,
  title_ku       text, title_fa text, title_ar text, title_en text,
  is_sample      boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS promotions_business_idx ON promotions(business_id);

CREATE TABLE IF NOT EXISTS media (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  mime        text NOT NULL DEFAULT 'image/png',
  byte_size   integer NOT NULL DEFAULT 0,
  data        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS backups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        text NOT NULL,
  backup_type text NOT NULL DEFAULT 'full' CHECK (backup_type IN ('full','custom','uploaded')),
  status      text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','restored','failed')),
  format_version text NOT NULL DEFAULT '1.0',
  manifest    jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  size_bytes  integer NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by_name text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz
);
CREATE INDEX IF NOT EXISTS backups_business_idx ON backups(business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    text UNIQUE NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subs_business_idx ON push_subscriptions(business_id);

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'new_order',
  title       text NOT NULL,
  body        text,
  order_id    uuid REFERENCES orders(id) ON DELETE CASCADE,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_business_idx ON notifications(business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS business_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  session_key text NOT NULL,
  source      text NOT NULL DEFAULT 'menu',
  viewed_on   date NOT NULL DEFAULT CURRENT_DATE,
  is_sample   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, session_key, viewed_on)
);
CREATE INDEX IF NOT EXISTS business_views_idx ON business_views(business_id, viewed_on);

CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Additive migrations (safe to re-run on an existing database).
ALTER TABLE business_views ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS restored_at timestamptz;

-- Product detail fields carried by the Add / Edit Product form. All additive, so
-- existing products keep their values and simply start with none of the new ones.
-- `calories` and `prep_minutes` are optional; `tags` is the product's own tag list;
-- `featured` is the "special / featured" flag, kept separate from `active` and
-- `available`; `price_fa` / `price_en` are OPTIONAL alternate-currency prices for
-- those two locales (IRR and USD) that the owner enters by hand.
ALTER TABLE products ADD COLUMN IF NOT EXISTS calories integer CHECK (calories >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS prep_minutes integer CHECK (prep_minutes >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_fa numeric(12,2) CHECK (price_fa >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_en numeric(12,2) CHECK (price_en >= 0);

-- Historical table label per order. A table can later be deleted, which releases
-- `table_id`, so the name the customer actually sat at is snapshotted at order
-- time and past orders keep showing it. Reads prefer the live table and fall back
-- to this snapshot.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_name text;

-- How that table was identified: the guest scanned the table's own QR code
-- ('qr') or someone picked it in the order form ('manual'). NULL for orders
-- without a table and for every order saved before this column existed.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_source text
  CHECK (table_source IS NULL OR table_source IN ('qr', 'manual'));

-- Table identity fields carried by the Add / Edit Table form. All additive, so
-- existing tables keep their values and simply gain the new ones.
--
-- A table keeps ONE record: its four localized names live in the name_* columns
-- (the same shape categories and products already use), while `name` stays the
-- resolved display value every other part of the app reads (orders, receipts,
-- customer menu, dashboard). `table_number` is the number the guest sees and is
-- unique inside a business; `display_order` is the owner's own ordering of the
-- table grid; `vip` is a plain attribute of the table — it carries no automatic
-- charge, discount or access rule.
ALTER TABLE tables ADD COLUMN IF NOT EXISTS name_ku text;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS name_fa text;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS name_ar text;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS table_number integer CHECK (table_number > 0);
ALTER TABLE tables ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS vip boolean NOT NULL DEFAULT false;

-- One table number per business, enforced by the database so two simultaneous
-- creates can never both take the same number. Existing tables have no number
-- yet, and the partial index leaves them out until each one is given a number.
CREATE UNIQUE INDEX IF NOT EXISTS tables_business_number_key
  ON tables (business_id, table_number) WHERE table_number IS NOT NULL;

-- Promotion usage limits. Additive: a promotion without a limit keeps behaving
-- exactly as before (max_uses NULL = unlimited) and starts counting real
-- redemptions from now on. `used_count` is only ever written by the server when
-- an order really took the promotion.
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS max_uses integer CHECK (max_uses > 0);
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS used_count integer NOT NULL DEFAULT 0;

-- Code-based promotions. A promotion now carries a redemption code the guest
-- types at checkout, a minimum order value and a target (the whole order, one
-- category or one product). Additive: promotions created before this keep
-- `code` NULL and behave exactly as before — their price is applied
-- automatically on the customer menu. `target_type` defaults to 'product'
-- because that is what every existing row is.
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS min_order numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'product';
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE promotions DROP CONSTRAINT IF EXISTS promotions_target_type_check;
ALTER TABLE promotions ADD CONSTRAINT promotions_target_type_check
  CHECK (target_type IN ('order', 'category', 'product'));

-- One code per business, compared without case so SAVE5K and save5k collide.
CREATE UNIQUE INDEX IF NOT EXISTS promotions_business_code_key
  ON promotions (business_id, upper(code)) WHERE code IS NOT NULL;

-- A promotion with neither a code nor a product is a whole-order promotion.
UPDATE promotions SET target_type = 'order'
 WHERE target_type = 'product' AND product_id IS NULL AND code IS NULL;

-- The promotion code frozen with the order that redeemed it, so editing or
-- deleting a promotion never rewrites the history of a completed order.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promotion_code text;

-- Admin activity log: authorized changes to business-owned modules that were not
-- audited anywhere else (menu, tables, promotions, ads, reviews, users, settings,
-- backups). Append-only; order status changes and receipt prints keep their own
-- dedicated tables and are merged with this one by the activity report.
CREATE TABLE IF NOT EXISTS activity_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  actor_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_name   text,
  entity       text NOT NULL,
  action       text NOT NULL,
  entity_id    uuid,
  entity_label text,
  path         text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_log_business_idx ON activity_log(business_id, created_at DESC);

-- Report-level archival of activity entries. An authorized member can remove a
-- logged change from the activity report, which writes one row here; the
-- authoritative `activity_log` row itself is never deleted. Protected audit
-- streams (order status history, receipt prints, permission and backup events)
-- are never written here at all.
CREATE TABLE IF NOT EXISTS activity_hidden (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  kind           text NOT NULL,
  entry_id       uuid NOT NULL,
  hidden_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  hidden_by_name text,
  hidden_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, kind, entry_id)
);
CREATE INDEX IF NOT EXISTS activity_hidden_business_idx ON activity_hidden(business_id, kind, entry_id);

-- One-time fill of the localized names for tables created before the four
-- languages existed: they start as the single name they already carry in every
-- language, and a table that already has any localized name is left untouched so
-- an edited translation is never overwritten.
UPDATE tables
   SET name_ku = name, name_fa = name, name_ar = name, name_en = name
 WHERE name IS NOT NULL
   AND name_ku IS NULL AND name_fa IS NULL AND name_ar IS NULL AND name_en IS NULL;

-- Advertisement scheduling, placement and menu relations. Additive: an older
-- advertisement keeps its picture, text and active flag, gains `below_header`
-- placement, no schedule (always eligible while active) and no relation, so it
-- keeps appearing exactly where it always did.
--
-- `starts_at` / `ends_at` are absolute instants written by the server from the
-- business's own timezone. An advertisement is publicly eligible only while it
-- is active AND inside that window — an enabled but expired advertisement stays
-- visible to its owners here and disappears from the customer menu.
--
-- `placement` is one of the positions the customer menu really renders
-- ('below_header', 'menu_end'); `sort_order` is the owner's priority within a
-- placement (higher first, newest first on a tie).
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'below_header';
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE advertisements DROP CONSTRAINT IF EXISTS advertisements_placement_check;
ALTER TABLE advertisements ADD CONSTRAINT advertisements_placement_check
  CHECK (placement IN ('below_header', 'menu_end'));

CREATE INDEX IF NOT EXISTS ads_public_idx
  ON advertisements (business_id, placement, starts_at, ends_at) WHERE active;

-- Tabbed business settings additions. Additive only: an existing business keeps
-- its single `address` (still used as the fallback everywhere it was before)
-- and gains an empty per-language address map, plus the dashboard section
-- visibility flags every dashboard has always shown.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS addresses jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS dashboard_settings jsonb NOT NULL DEFAULT '{"show_overview":true,"show_insights":true,"show_order_notifications":true,"show_recent_orders":true,"show_notification_settings":true}'::jsonb;
