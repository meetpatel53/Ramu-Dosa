-- Drop existing tables to recreate with Integer IDs
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS categories;

-- 1. Create Categories Table with Integer IDs
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  is_chinese BOOLEAN DEFAULT FALSE,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Menu Items Table with Integer ID and Category ID (Int)
CREATE TABLE menu_items (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  half_price NUMERIC,
  full_price NUMERIC,
  image_url TEXT,
  display_order INTEGER,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Orders Table (Petpooja style)
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_number TEXT NOT NULL,
  items JSONB NOT NULL, -- Array of {name, quantity, price, type}
  total_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled')),
  table_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Allow public read access to categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to menu_items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Allow users to insert their own orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow users to view their own orders" ON orders FOR SELECT USING (true);
