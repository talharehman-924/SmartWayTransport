-- =============================================
-- SUPABASE DATABASE SETUP  (fresh / idempotent)
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New Query
-- Safe to re-run — drops & recreates everything.
-- =============================================

-- ── Drop old tables (cascade removes policies & indexes) ──
DROP TABLE IF EXISTS bookings  CASCADE;
DROP TABLE IF EXISTS drivers   CASCADE;
DROP TABLE IF EXISTS config    CASCADE;
DROP TABLE IF EXISTS login_logs CASCADE;
DROP TABLE IF EXISTS users     CASCADE;

-- ── 1. Users (members only — admin is hardcoded, not stored here) ──
CREATE TABLE users (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email      TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'member'  CHECK (role   IN ('admin','member')),
    status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Login logs ──
CREATE TABLE login_logs (
    id        BIGSERIAL PRIMARY KEY,
    uid       TEXT,
    email     TEXT,
    role      TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Config (vehicles, packages stored as JSON arrays) ──
CREATE TABLE config (
    key   TEXT PRIMARY KEY,
    items JSONB DEFAULT '[]'::jsonb
);

-- ── 4. Drivers ──
CREATE TABLE drivers (
    id             BIGSERIAL PRIMARY KEY,
    name           TEXT NOT NULL,
    contact        TEXT,
    vehicle_name   TEXT,
    vehicle_number TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Bookings ──
CREATE TABLE bookings (
    id                BIGSERIAL PRIMARY KEY,
    client_name       TEXT,
    client_contact    TEXT,
    date              DATE,
    pickup_time       TEXT,
    vehicle           TEXT,
    package           TEXT,
    adults            INTEGER DEFAULT 0,
    children          INTEGER DEFAULT 0,
    luggage_suitcase  INTEGER DEFAULT 0,
    luggage_hand_carry INTEGER DEFAULT 0,
    luggage_carton    INTEGER DEFAULT 0,
    luggage_stroller  INTEGER DEFAULT 0,
    luggage_wheelchair INTEGER DEFAULT 0,
    payment_sar       NUMERIC DEFAULT 0,
    driver_name       TEXT,
    driver_contact    TEXT,
    driver_vehicle    TEXT,
    driver_reg_no     TEXT,
    commission_sar    NUMERIC DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Enable Row Level Security ──
ALTER TABLE users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings   ENABLE ROW LEVEL SECURITY;

-- ── 6. Driver Payments ──
CREATE TABLE driver_payments (
    id SERIAL PRIMARY KEY,
    driver_name TEXT,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_method TEXT CHECK (payment_method IN ('Cash', 'Online')),
    recorded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════
-- RLS POLICIES
-- ══════════════════════════════════════

-- ▸ users
CREATE POLICY "users_select"  ON users FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "users_insert"  ON users FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "users_update"  ON users FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- ▸ login_logs
CREATE POLICY "logs_select"   ON login_logs FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "logs_insert"   ON login_logs FOR INSERT TO authenticated, anon WITH CHECK (true);

-- ▸ config
CREATE POLICY "config_select" ON config FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "config_insert" ON config FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "config_update" ON config FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- ▸ drivers
CREATE POLICY "drivers_select" ON drivers FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "drivers_insert" ON drivers FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "drivers_update" ON drivers FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "drivers_delete" ON drivers FOR DELETE TO authenticated, anon USING (true);

-- ▸ bookings
CREATE POLICY "bookings_select" ON bookings FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "bookings_update" ON bookings FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "bookings_delete" ON bookings FOR DELETE TO authenticated, anon USING (true);

-- ▸ driver_payments
CREATE POLICY "driver_payments_select" ON driver_payments FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "driver_payments_insert" ON driver_payments FOR INSERT TO authenticated, anon WITH CHECK (true);

-- ── Indexes ──
CREATE INDEX idx_users_id        ON users(id);
CREATE INDEX idx_login_logs_uid  ON login_logs(uid);
CREATE INDEX idx_config_key      ON config(key);
CREATE INDEX idx_bookings_date   ON bookings(date);
