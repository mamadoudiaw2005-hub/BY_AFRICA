-- ==============================================================================
-- SCHEMA SUPABASE OFFICIEL & DURCI (SÉCURITÉ PRODUCTION) POUR BY_AFRIKA
-- ==============================================================================
-- Ce script SQL configure l'ensemble des tables et applique les politiques
-- de sécurité Row-Level Security (RLS) de niveau production pour protéger
-- les données personnelles des clients, les commandes et le catalogue.
-- ==============================================================================
-- INSTRUCTIONS :
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
    permissions JSONB DEFAULT '{}'::jsonb,
    notify_announcements BOOLEAN DEFAULT true,
    auth_provider TEXT DEFAULT 'local',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assurer l'existence de toutes les colonnes nécessaires si la table a été créée précédemment
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'local';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notify_announcements BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

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
-- POLITIQUES DE SÉCURITÉ DE PRODUCTION (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

-- Activation de RLS sur toutes les tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. SÉCURITÉ DU CATALOGUE (products)
-- ------------------------------------------------------------------------------
-- 1. Tout le monde peut voir les vêtements en boutique (Lecture publique)
DROP POLICY IF EXISTS "products_all_access" ON products;
DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY "products_public_read" ON products 
    FOR SELECT 
    USING (true);

-- 2. Seul l'administrateur authentifié peut ajouter, modifier ou supprimer un article
DROP POLICY IF EXISTS "products_admin_write" ON products;
CREATE POLICY "products_admin_write" ON products 
    FOR ALL 
    USING (
        auth.role() = 'authenticated' AND (
            (auth.jwt() ->> 'email') IN ('admin@byafrica.com', 'adama@byafrica.com', 'adamadioume@byafrica.com')
            OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND (
            (auth.jwt() ->> 'email') IN ('admin@byafrica.com', 'adama@byafrica.com', 'adamadioume@byafrica.com')
            OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        )
    );

-- ------------------------------------------------------------------------------
-- B. SÉCURITÉ DES COMMANDES (orders)
-- ------------------------------------------------------------------------------
-- 1. Tout client (visiteur ou connecté) peut passer commande (Création publique)
DROP POLICY IF EXISTS "orders_all_access" ON orders;
DROP POLICY IF EXISTS "orders_public_insert" ON orders;
CREATE POLICY "orders_public_insert" ON orders 
    FOR INSERT 
    WITH CHECK (true);

-- 2. Les administrateurs peuvent voir, modifier le statut et gérer toutes les commandes
DROP POLICY IF EXISTS "orders_admin_all" ON orders;
CREATE POLICY "orders_admin_all" ON orders 
    FOR ALL 
    USING (
        auth.role() = 'authenticated' AND (
            (auth.jwt() ->> 'email') IN ('admin@byafrica.com', 'adama@byafrica.com', 'adamadioume@byafrica.com')
            OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        )
    );

-- 3. Un client connecté ne peut consulter QUE ses propres commandes
DROP POLICY IF EXISTS "orders_client_read" ON orders;
CREATE POLICY "orders_client_read" ON orders 
    FOR SELECT 
    USING (
        auth.role() = 'authenticated' AND (
            customer ->> 'email' = (auth.jwt() ->> 'email')
        )
    );

-- ------------------------------------------------------------------------------
-- C. SÉCURITÉ DES RÉCLAMATIONS ET MESSAGES (messages)
-- ------------------------------------------------------------------------------
-- 1. Tout visiteur peut envoyer une réclamation ou un message SAV (Insert public sans restriction)
DROP POLICY IF EXISTS "messages_all_access" ON messages;
DROP POLICY IF EXISTS "messages_public_insert" ON messages;
DROP POLICY IF EXISTS "messages_admin_all" ON messages;
DROP POLICY IF EXISTS "messages_management_all" ON messages;

CREATE POLICY "messages_public_insert" ON messages 
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "messages_admin_all" ON messages 
    FOR ALL 
    USING (
        auth.role() = 'authenticated' AND (
            (auth.jwt() ->> 'email') = 'admin@byafrika.com'
            OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'Fondateur')
            OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'Fondateur')
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND (
            (auth.jwt() ->> 'email') = 'admin@byafrika.com'
            OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'Fondateur')
            OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'Fondateur')
        )
    );

-- ------------------------------------------------------------------------------
-- D. SÉCURITÉ DE LA CONFIGURATION (site_config)
-- ------------------------------------------------------------------------------
-- 1. Lecture publique pour afficher les coordonnées, réseaux sociaux et livraison
DROP POLICY IF EXISTS "site_config_all_access" ON site_config;
DROP POLICY IF EXISTS "site_config_public_read" ON site_config;
CREATE POLICY "site_config_public_read" ON site_config 
    FOR SELECT 
    USING (true);

-- 2. Modification réservée exclusivement à l'administrateur
DROP POLICY IF EXISTS "site_config_admin_write" ON site_config;
CREATE POLICY "site_config_admin_write" ON site_config 
    FOR ALL 
    USING (
        auth.role() = 'authenticated' AND (
            (auth.jwt() ->> 'email') IN ('admin@byafrica.com', 'adama@byafrica.com', 'adamadioume@byafrica.com')
            OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND (
            (auth.jwt() ->> 'email') IN ('admin@byafrica.com', 'adama@byafrica.com', 'adamadioume@byafrica.com')
            OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        )
    );

-- ------------------------------------------------------------------------------
-- E. SÉCURITÉ DES COMPTES UTILISATEURS (users)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_all_access" ON users;
DROP POLICY IF EXISTS "users_self_read_write" ON users;
DROP POLICY IF EXISTS "users_admin_all" ON users;
DROP POLICY IF EXISTS "users_management_all" ON users;

CREATE POLICY "users_self_read_write" ON users 
    FOR ALL 
    USING (
        auth.role() = 'authenticated' AND (
            auth.uid()::text = id
            OR (auth.jwt() ->> 'email') = email
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND (
            auth.uid()::text = id
            OR (auth.jwt() ->> 'email') = email
        )
    );

CREATE POLICY "users_admin_all" ON users 
    FOR ALL 
    USING (
        auth.role() = 'authenticated' AND (
            (auth.jwt() ->> 'email') = 'admin@byafrika.com'
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND (
            (auth.jwt() ->> 'email') = 'admin@byafrika.com'
        )
    );

-- ==============================================================================
-- INDEX D'OPTIMISATION DE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ==============================================================================
-- INITIALISATION DU COMPTE FONDATEUR UNIQUE DANS public.users
-- ==============================================================================
DELETE FROM public.users WHERE email IN ('admin@byafrica.com', 'adamadioume@byafrica.com', 'adama@byafrica.com', 'admin@byafrika.com');

INSERT INTO public.users (id, name, email, role, permissions, auth_provider)
VALUES 
    ('usr_founder_adama', 'Adama Dioume', 'admin@byafrika.com', 'Fondateur', '{"dashboard": true, "products": true, "orders": true, "messages": true, "config": true, "roles": true}'::jsonb, 'local');
