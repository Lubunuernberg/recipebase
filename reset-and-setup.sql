-- RecipeBase: Reset & Neuanfang
-- Führt alles aus: Löschen → Schema → Demo-Daten

-- 1. ERST LÖSCHEN (Reihenfolge wegen Foreign Keys)
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS weekly_menu CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS haccp_temperatures CASCADE;
DROP TABLE IF EXISTS haccp_cleaning CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- 2. SCHEMA NEU ERSTELLEN

-- Restaurants
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Members
CREATE TABLE team_members (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'chef', 'staff')),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ingredients
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

-- Recipes
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  instructions TEXT[],
  prep_time INTEGER,
  sell_price DECIMAL(10, 2),
  portions INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipe Ingredients
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  amount DECIMAL(10, 3) NOT NULL,
  unit TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security aktivieren
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their restaurant" ON restaurants
  FOR SELECT USING (id IN (SELECT restaurant_id FROM team_members WHERE id = auth.uid()));

CREATE POLICY "Users can view team members of their restaurant" ON team_members
  FOR SELECT USING (restaurant_id IN (SELECT restaurant_id FROM team_members WHERE id = auth.uid()));

CREATE POLICY "Users can manage ingredients of their restaurant" ON ingredients
  FOR ALL USING (restaurant_id IN (SELECT restaurant_id FROM team_members WHERE id = auth.uid()));

CREATE POLICY "Users can manage recipes of their restaurant" ON recipes
  FOR ALL USING (restaurant_id IN (SELECT restaurant_id FROM team_members WHERE id = auth.uid()));

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. DEMO-DATEN EINFÜGEN
DO $$
DECLARE
    v_restaurant_id UUID;
    v_recipe_id UUID;
    v_ingredient_id UUID;
BEGIN
    -- Restaurant
    INSERT INTO restaurants (name, address, phone, settings)
    VALUES ('Lu-Bu Restaurant', 'Wiesenstraße 8, Nürnberg', '+49 911 123456', '{"currency": "EUR"}')
    RETURNING id INTO v_restaurant_id;

    -- Dein Account verknüpfen
    INSERT INTO team_members (id, email, name, role, restaurant_id)
    VALUES ('75456446-c2a9-43b3-9d20-0e61c5dfdb3b', 'Manh-hung@web.de', 'Hung Do', 'owner', v_restaurant_id);

    -- Zutat: Rindfleisch
    INSERT INTO ingredients (restaurant_id, name, unit, price_per_unit, current_stock, min_stock, max_stock, supplier)
    VALUES (v_restaurant_id, 'Rindfleisch', 'kg', 18.50, 5.5, 2, 10, 'Metzgerei Schmidt')
    RETURNING id INTO v_ingredient_id;

    -- Rezept: Pho Bo
    INSERT INTO recipes (restaurant_id, name, category, description, prep_time, sell_price, portions, instructions)
    VALUES (v_restaurant_id, 'Pho Bo', 'Hauptgericht', 'Vietnamesische Nudelsuppe mit Rindfleisch', 45, 14.90, 1, 
            ARRAY['Brühe vorbereiten', 'Nudeln kochen', 'Fleisch anbraten', 'Anrichten'])
    RETURNING id INTO v_recipe_id;

    -- Rezept-Zutat verknüpfen
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
    VALUES (v_recipe_id, v_ingredient_id, 0.200, 'kg');

    -- Weitere Zutaten
    INSERT INTO ingredients (restaurant_id, name, unit, price_per_unit, current_stock, min_stock, max_stock, supplier) VALUES
    (v_restaurant_id, 'Hähnchenbrust', 'kg', 12.80, 3.2, 2, 8, 'Geflügelhof Müller'),
    (v_restaurant_id, 'Reisnudeln', 'kg', 4.20, 8, 5, 15, 'Asien Grosshandel'),
    (v_restaurant_id, 'Kokosmilch', 'l', 2.90, 4, 3, 12, 'Asien Grosshandel'),
    (v_restaurant_id, 'Zitronengras', 'Bund', 1.50, 8, 5, 20, 'Frischeparadies');
    
END $$;
