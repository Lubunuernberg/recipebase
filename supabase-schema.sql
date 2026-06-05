-- RecipeBase Database Schema
-- Copy this into Supabase SQL Editor and run it

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Restaurants table
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users/Team members table (extends auth.users)
CREATE TABLE team_members (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'chef', 'staff')),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ingredients table
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'l', 'Stk', 'Bund', 'Pack')),
  price_per_unit DECIMAL(10, 2) DEFAULT 0,
  current_stock DECIMAL(10, 2) DEFAULT 0,
  min_stock DECIMAL(10, 2) DEFAULT 0,
  max_stock DECIMAL(10, 2) DEFAULT 0,
  supplier TEXT,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  instructions TEXT[],
  prep_time INTEGER, -- minutes
  sell_price DECIMAL(10, 2),
  portions INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipe ingredients junction table
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  amount DECIMAL(10, 3) NOT NULL,
  unit TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weekly menu planning
CREATE TABLE weekly_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  portions INTEGER DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock movements
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  amount DECIMAL(10, 3) NOT NULL,
  reason TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'confirmed', 'delivered', 'cancelled')),
  total_amount DECIMAL(10, 2),
  notes TEXT,
  order_date DATE,
  delivery_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  amount DECIMAL(10, 3) NOT NULL,
  unit TEXT NOT NULL,
  price_per_unit DECIMAL(10, 2),
  notes TEXT
);

-- HACCP temperature logs
CREATE TABLE haccp_temperatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  target_temp DECIMAL(5, 2),
  actual_temp DECIMAL(5, 2),
  checked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HACCP cleaning schedule
CREATE TABLE haccp_cleaning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  task TEXT NOT NULL,
  frequency TEXT NOT NULL,
  last_cleaned TIMESTAMP WITH TIME ZONE,
  next_due TIMESTAMP WITH TIME ZONE,
  done_by UUID REFERENCES auth.users(id),
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  file_url TEXT,
  invoice_number TEXT,
  invoice_date DATE,
  total_amount DECIMAL(10, 2),
  parsed_data JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security Policies

-- Restaurants: Users can only see their own restaurant
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their restaurant" ON restaurants
  FOR SELECT USING (
    id IN (SELECT restaurant_id FROM team_members WHERE id = auth.uid())
  );

-- Team members: Users can see team members of their restaurant
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team members of their restaurant" ON team_members
  FOR SELECT USING (
    restaurant_id IN (SELECT restaurant_id FROM team_members WHERE id = auth.uid())
  );

-- Ingredients: Users can CRUD ingredients of their restaurant
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage ingredients of their restaurant" ON ingredients
  FOR ALL USING (
    restaurant_id IN (SELECT restaurant_id FROM team_members WHERE id = auth.uid())
  );

-- Recipes: Users can CRUD recipes of their restaurant
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage recipes of their restaurant" ON recipes
  FOR ALL USING (
    restaurant_id IN (SELECT restaurant_id FROM team_members WHERE id = auth.uid())
  );

-- Apply RLS to all other tables similarly
ALTER TABLE weekly_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_temperatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_cleaning ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Functions for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_menu_updated_at BEFORE UPDATE ON weekly_menu
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
