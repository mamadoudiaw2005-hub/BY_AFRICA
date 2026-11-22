-- ==============================================================================
-- SCHEMA SUPABASE OFFICIEL POUR BY_AFRIKA (E-Commerce Premium)
-- ==============================================================================
-- Ce script SQL permet de créer toutes les tables nécessaires dans votre projet Supabase.
-- Pour l'exécuter :
-- 1. Rendez-vous sur votre tableau de bord Supabase : https://supabase.com
-- 2. Allez dans la section "SQL Editor"
-- 3. Collez ce script complet et cliquez sur "Run" (Exécuter).
-- ==============================================================================

-- 1. Table des Produits (products)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    genre TEXT DEFAULT 'Unisexe',
    category TEXT DEFAULT 'T-shirts',
    sizes JSONB DEFAULT '["S", "M", "L", "XL", "XXL"]'::jsonb,
    colors JSONB DEFAULT '["Noir", "Blanc"]'::jsonb,
    stock INTEGER NOT NULL DEFAULT 10,
    image TEXT DEFAULT 'tshirt-byafrika.jpg',
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des Commandes (orders)
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    customer JSONB NOT NULL DEFAULT '{}'::jsonb,
    delivery_type TEXT DEFAULT 'Livraison à domicile',
    delivery_fee NUMERIC DEFAULT 2000,
    total NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'Reçue',
    payment_method TEXT DEFAULT 'Paiement à la livraison (Arriver Payer)',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table des Utilisateurs & Gestion des Rôles (users)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    password_hash TEXT,
    role TEXT DEFAULT 'client',
    notify_announcements BOOLEAN DEFAULT true,
    auth_provider TEXT DEFAULT 'local',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des Messages & Réclamations clients (messages)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    subject TEXT DEFAULT 'Demande client',
    type TEXT DEFAULT 'Demande générale',
    order_id TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'Nouveau',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table de Configuration Générale du Site (site_config)
CREATE TABLE IF NOT EXISTS site_config (
    id TEXT PRIMARY KEY DEFAULT 'main',
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ACTIVATION DE ROW LEVEL SECURITY (RLS) & POLITIQUES D'ACCÈS
-- ==============================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Politiques pour la table "products" (Lecture publique, écriture autorisée pour le backend/admin)
DROP POLICY IF EXISTS "products_all_access" ON products;
CREATE POLICY "products_all_access" ON products FOR ALL USING (true) WITH CHECK (true);

-- Politiques pour la table "orders"
DROP POLICY IF EXISTS "orders_all_access" ON orders;
CREATE POLICY "orders_all_access" ON orders FOR ALL USING (true) WITH CHECK (true);

-- Politiques pour la table "users"
DROP POLICY IF EXISTS "users_all_access" ON users;
CREATE POLICY "users_all_access" ON users FOR ALL USING (true) WITH CHECK (true);

-- Politiques pour la table "messages"
DROP POLICY IF EXISTS "messages_all_access" ON messages;
CREATE POLICY "messages_all_access" ON messages FOR ALL USING (true) WITH CHECK (true);

-- Politiques pour la table "site_config"
DROP POLICY IF EXISTS "site_config_all_access" ON site_config;
CREATE POLICY "site_config_all_access" ON site_config FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- INDEX POUR ACCÉLÉRER LES RECHERCHES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
