PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('marketer','customer','admin')),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_token_expiry ON sessions(token_hash,expires_at);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  supplier_id TEXT REFERENCES suppliers(id),
  external_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL,
  currency TEXT NOT NULL DEFAULT 'DZD',
  stock INTEGER,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','out_of_stock','hidden')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(supplier_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_products_status_created ON products(status,created_at);

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  marketer_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS affiliate_links (
  id TEXT PRIMARY KEY,
  marketer_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  code TEXT NOT NULL UNIQUE,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES users(id),
  marketer_id TEXT REFERENCES users(id),
  store_id TEXT REFERENCES stores(id),
  status TEXT NOT NULL DEFAULT 'pending',
  total REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'DZD',
  customer_name TEXT,
  customer_phone TEXT,
  shipping_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  commission REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS commissions (
  id TEXT PRIMARY KEY,
  marketer_id TEXT NOT NULL REFERENCES users(id),
  order_id TEXT NOT NULL REFERENCES orders(id),
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'DZD',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY,
  marketer_id TEXT NOT NULL REFERENCES users(id),
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'DZD',
  payout_method TEXT,
  payout_details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id TEXT REFERENCES suppliers(id),
  source TEXT,
  status TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
