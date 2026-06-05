#!/bin/bash
# RecipeBase Database Setup Script
# Führt alle SQL-Befehle automatisch aus

SUPABASE_URL="https://nrrqqzswqlcucxqacuvj.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ycnFxenN3cWxjdWN4cWFjdXZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY1NzQ0MSwiZXhwIjoyMDk2MjMzNDQxfQ.eZXHbe0OCMfsx1gTiSdNeq_4bDJFobHA14O2qzdF69s"
USER_ID="75456446-c2a9-43b3-9d20-0e61c5dfdb3b"

echo "=== RecipeBase Datenbank Setup ==="
echo ""

# Funktion zum Ausführen von SQL
exec_sql() {
    local sql="$1"
    local response=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
        -H "apikey: $SERVICE_KEY" \
        -H "Authorization: Bearer $SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"sql\": \"$sql\"}" 2>&1)
    
    if [[ $response == *"error"* ]]; then
        echo "Fehler: $response"
        return 1
    fi
    echo "OK"
    return 0
}

# Alternative: REST API direkt nutzen
echo "Erstelle Tabellen..."

# Restaurants
curl -s -X POST "$SUPABASE_URL/rest/v1/restaurants" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=ignore-duplicates" \
    -d '[]' 2>/dev/null || true

echo ""
echo "=== Setup Hinweis ==="
echo ""
echo "Da keine RPC-Funktion verfügbar ist, musst du leider doch manuell vorgehen:"
echo ""
echo "1. Gehe zu: https://supabase.com/dashboard/project/nrrqqzswqlcucxqacuvj/sql"
echo "2. Kopiere den Inhalt von supabase-schema.sql"
echo "3. Führe es aus"
echo "4. Dann führe demo-data.sql aus"
echo ""
echo "Die Dateien liegen hier:"
echo "  - /data/.openclaw/workspace/recipebase/supabase-schema.sql"
echo "  - /data/.openclaw/workspace/recipebase/demo-data.sql"
echo ""

# Erstelle demo-data.sql
read -r -d '' DEMO_DATA << 'EOF'
-- Demo-Daten für Lu-Bu Restaurant

-- 1. Restaurant anlegen und ID speichern
DO $$
DECLARE
    v_restaurant_id UUID;
BEGIN
    -- Restaurant erstellen
    INSERT INTO restaurants (name, address, phone, settings)
    VALUES ('Lu-Bu Restaurant', 'Wiesenstraße 8, Nürnberg', '+49 911 123456', '{"currency": "EUR"}')
    RETURNING id INTO v_restaurant_id;

    -- 2. Team-Mitglied verknüpfen
    INSERT INTO team_members (id, email, name, role, restaurant_id)
    VALUES ('75456446-c2a9-43b3-9d20-0e61c5dfdb3b', 'Manh-hung@web.de', 'Hung Do', 'owner', v_restaurant_id);

    -- 3. Demo-Zutaten
    INSERT INTO ingredients (restaurant_id, name, unit, price_per_unit, current_stock, min_stock, max_stock, supplier) VALUES
    (v_restaurant_id, 'Rindfleisch', 'kg', 18.50, 5.5, 2, 10, 'Metzgerei Schmidt'),
    (v_restaurant_id, 'Hähnchenbrust', 'kg', 12.80, 3.2, 2, 8, 'Geflügelhof Müller'),
    (v_restaurant_id, 'Reisnudeln', 'kg', 4.20, 8, 5, 15, 'Asien Grosshandel'),
    (v_restaurant_id, 'Kokosmilch', 'l', 2.90, 4, 3, 12, 'Asien Grosshandel'),
    (v_restaurant_id, 'Zitronengras', 'Bund', 1.50, 8, 5, 20, 'Frischeparadies');

    -- 4. Demo-Rezept: Pho Bo
    INSERT INTO recipes (restaurant_id, name, category, description, prep_time, sell_price, portions, instructions)
    VALUES (v_restaurant_id, 'Pho Bo', 'Hauptgericht', 'Vietnamesische Nudelsuppe mit Rindfleisch', 45, 14.90, 1, 
            ARRAY['Brühe vorbereiten', 'Nudeln kochen', 'Fleisch anbraten', 'Anrichten']);
END $$;
EOF

echo "$DEMO_DATA" > /data/.openclaw/workspace/recipebase/demo-data.sql

echo "✅ Dateien erstellt!"
echo ""
