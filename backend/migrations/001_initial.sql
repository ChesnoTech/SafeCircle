-- SafeCircle Database Schema
-- PostgreSQL 16 + PostGIS 3
-- Run: docker exec -i safecircle-postgres psql -U safecircle safecircle < migrations/001_initial.sql

-- ============================================
-- Extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Enums
-- ============================================
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'law_enforcement', 'admin');
CREATE TYPE report_status AS ENUM ('active', 'resolved', 'expired', 'cancelled');
CREATE TYPE item_status AS ENUM ('available', 'matched', 'returned', 'expired');
CREATE TYPE sighting_confidence AS ENUM ('certain', 'likely', 'unsure');
CREATE TYPE direction AS ENUM ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'stationary', 'unknown');
CREATE TYPE pattern_status AS ENUM ('monitoring', 'threshold_reached', 'reviewed', 'forwarded', 'resolved', 'dismissed');
CREATE TYPE match_status AS ENUM ('pending', 'confirmed', 'rejected');
CREATE TYPE reward_tier AS ENUM ('bronze', 'silver', 'gold');
CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'unknown');

-- ============================================
-- Users
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    photo_url TEXT,
    location GEOGRAPHY(Point, 4326),
    language TEXT DEFAULT 'en',
    country TEXT DEFAULT 'RU',
    notification_radius_km INT DEFAULT 10,
    notification_categories TEXT[] DEFAULT ARRAY['missing_person', 'lost_found'],
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    credibility_score INT DEFAULT 50 CHECK (credibility_score >= 0 AND credibility_score <= 100),
    role user_role DEFAULT 'user',
    fcm_token TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_location ON users USING GIST (location);
CREATE INDEX idx_users_email ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_fcm ON users (fcm_token) WHERE fcm_token IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_users_active ON users (last_active_at DESC) WHERE deleted_at IS NULL;

-- ============================================
-- Missing Person Reports
-- ============================================
CREATE TABLE missing_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    -- Person info
    name TEXT NOT NULL,
    age INT,
    gender gender DEFAULT 'unknown',
    photo_url TEXT NOT NULL,
    description JSONB DEFAULT '{}',
    -- Physical description (standardized for cross-language matching)
    skin_tone INT CHECK (skin_tone >= 1 AND skin_tone <= 10),
    hair_color TEXT,
    eye_color TEXT,
    height_min_cm INT,
    height_max_cm INT,
    weight_min_kg INT,
    weight_max_kg INT,
    -- Location
    last_seen_location GEOGRAPHY(Point, 4326) NOT NULL,
    last_seen_address TEXT,
    last_seen_at TIMESTAMPTZ,
    clothing_description TEXT,
    circumstances TEXT,
    -- Alert settings
    alert_radius_km INT DEFAULT 5,
    auto_expand BOOLEAN DEFAULT TRUE,
    -- Country-specific extension (JSONB — flexible per country)
    country_extension JSONB DEFAULT '{}',
    -- Status
    status report_status DEFAULT 'active',
    resolved_at TIMESTAMPTZ,
    sighting_count INT DEFAULT 0,
    -- Metadata
    country TEXT DEFAULT 'RU',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours')
);

-- THE most important index — "active alerts near me"
CREATE INDEX idx_missing_active_location ON missing_reports
    USING GIST (last_seen_location)
    WHERE status = 'active';
CREATE INDEX idx_missing_reporter ON missing_reports (reporter_id);
CREATE INDEX idx_missing_status ON missing_reports (status, created_at DESC);
CREATE INDEX idx_missing_country ON missing_reports (country, status);
CREATE INDEX idx_missing_expires ON missing_reports (expires_at) WHERE status = 'active';

-- ============================================
-- Sightings
-- ============================================
CREATE TABLE sightings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES missing_reports(id) ON DELETE CASCADE,
    spotter_id UUID REFERENCES users(id),
    location GEOGRAPHY(Point, 4326) NOT NULL,
    confidence sighting_confidence DEFAULT 'unsure',
    direction_of_travel direction DEFAULT 'unknown',
    photo_url TEXT,
    notes TEXT,
    accompanied TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sightings_report ON sightings (report_id, created_at DESC);
CREATE INDEX idx_sightings_location ON sightings USING GIST (location);

-- ============================================
-- Lost Items
-- ============================================
CREATE TABLE lost_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    lost_location GEOGRAPHY(Point, 4326) NOT NULL,
    lost_address TEXT,
    lost_time_from TIMESTAMPTZ,
    lost_time_to TIMESTAMPTZ,
    reward INT DEFAULT 0,
    country_extension JSONB DEFAULT '{}',
    status item_status DEFAULT 'available',
    country TEXT DEFAULT 'RU',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lost_location ON lost_items USING GIST (lost_location);
CREATE INDEX idx_lost_category ON lost_items (category, status) WHERE status = 'available';
CREATE INDEX idx_lost_reporter ON lost_items (reporter_id);

-- ============================================
-- Found Items
-- ============================================
CREATE TABLE found_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    finder_id UUID NOT NULL REFERENCES users(id),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    found_location GEOGRAPHY(Point, 4326) NOT NULL,
    found_address TEXT,
    found_time TIMESTAMPTZ,
    willing_to_hold BOOLEAN DEFAULT TRUE,
    handoff_preference TEXT DEFAULT 'in_person',
    country_extension JSONB DEFAULT '{}',
    status item_status DEFAULT 'available',
    country TEXT DEFAULT 'RU',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_found_location ON found_items USING GIST (found_location);
CREATE INDEX idx_found_category ON found_items (category, status) WHERE status = 'available';
CREATE INDEX idx_found_recent ON found_items (created_at DESC) WHERE status = 'available';

-- ============================================
-- Lost ↔ Found Matches
-- ============================================
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lost_item_id UUID NOT NULL REFERENCES lost_items(id) ON DELETE CASCADE,
    found_item_id UUID NOT NULL REFERENCES found_items(id) ON DELETE CASCADE,
    score FLOAT NOT NULL CHECK (score >= 0 AND score <= 1),
    status match_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lost_item_id, found_item_id)
);

CREATE INDEX idx_matches_lost ON matches (lost_item_id) WHERE status = 'pending';
CREATE INDEX idx_matches_found ON matches (found_item_id) WHERE status = 'pending';

-- ============================================
-- Community Intelligence (ANONYMOUS)
-- ============================================
CREATE TABLE intel_reports (
    -- NO reporter_id — anonymity is STRUCTURAL, not policy
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    subcategory TEXT,
    description TEXT NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    address TEXT,
    photo_url TEXT,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'urgent')),
    country TEXT DEFAULT 'RU',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intel_location ON intel_reports USING GIST (location);
CREATE INDEX idx_intel_category ON intel_reports (category, created_at DESC);
CREATE INDEX idx_intel_cat_loc ON intel_reports USING GIST (location) INCLUDE (category, created_at);

-- ============================================
-- Aggregated Patterns
-- ============================================
CREATE TABLE patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    center GEOGRAPHY(Point, 4326) NOT NULL,
    radius_m FLOAT,
    report_count INT DEFAULT 0,
    description_summary TEXT,
    time_pattern TEXT,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    status pattern_status DEFAULT 'monitoring',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    forwarded_to TEXT,
    forwarded_at TIMESTAMPTZ,
    reference_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patterns_location ON patterns USING GIST (center);
CREATE INDEX idx_patterns_status ON patterns (status);

-- ============================================
-- Media (photos, evidence)
-- ============================================
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type TEXT NOT NULL,
    report_id UUID NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    mime_type TEXT DEFAULT 'image/webp',
    size_bytes INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_report ON media (report_type, report_id);

-- ============================================
-- Messages (in-app chat for lost & found)
-- ============================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL,
    sender_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_thread ON messages (thread_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages (sender_id);

CREATE TABLE message_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type TEXT NOT NULL,
    report_id UUID NOT NULL,
    participant_ids UUID[] NOT NULL,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Rewards
-- ============================================
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    report_type TEXT NOT NULL,
    report_id UUID NOT NULL,
    tier reward_tier NOT NULL,
    description TEXT,
    amount INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rewards_user ON rewards (user_id);

-- ============================================
-- Refresh Tokens
-- ============================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens (token);

-- ============================================
-- Audit Log (law enforcement queries)
-- ============================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log (user_id, created_at DESC);

-- ============================================
-- Materialized Views
-- ============================================

-- Active alerts grid for map heatmap
CREATE MATERIALIZED VIEW active_alerts_grid AS
SELECT
    ST_SnapToGrid(last_seen_location::geometry, 0.01) AS cell,
    COUNT(*) AS alert_count,
    MAX(created_at) AS latest,
    array_agg(id) AS report_ids
FROM missing_reports
WHERE status = 'active'
GROUP BY cell;

CREATE INDEX idx_alerts_grid_cell ON active_alerts_grid USING GIST (cell);

-- ============================================
-- Functions
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_missing_reports_updated_at BEFORE UPDATE ON missing_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_lost_items_updated_at BEFORE UPDATE ON lost_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_found_items_updated_at BEFORE UPDATE ON found_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_patterns_updated_at BEFORE UPDATE ON patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Increment sighting count on missing reports
CREATE OR REPLACE FUNCTION increment_sighting_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE missing_reports
    SET sighting_count = sighting_count + 1
    WHERE id = NEW.report_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sighting_count AFTER INSERT ON sightings
    FOR EACH ROW EXECUTE FUNCTION increment_sighting_count();

-- Find users within radius for push notifications
CREATE OR REPLACE FUNCTION find_users_in_radius(
    center GEOGRAPHY,
    radius_km INT,
    max_results INT DEFAULT 5000
)
RETURNS TABLE (id UUID, fcm_token TEXT, distance_m FLOAT) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.fcm_token, ST_Distance(u.location, center) AS distance_m
    FROM users u
    WHERE u.fcm_token IS NOT NULL
      AND u.deleted_at IS NULL
      AND u.last_active_at > NOW() - INTERVAL '30 days'
      AND ST_DWithin(u.location, center, radius_km * 1000)
    ORDER BY ST_Distance(u.location, center)
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Match lost and found items by category + proximity + time
CREATE OR REPLACE FUNCTION find_matches_for_found_item(
    found_id UUID,
    max_distance_km INT DEFAULT 10,
    max_results INT DEFAULT 20
)
RETURNS TABLE (lost_item_id UUID, score FLOAT) AS $$
DECLARE
    found_rec RECORD;
BEGIN
    SELECT * INTO found_rec FROM found_items WHERE found_items.id = found_id;

    RETURN QUERY
    SELECT
        l.id AS lost_item_id,
        (
            -- Category match: 0.4
            CASE WHEN l.category = found_rec.category THEN 0.4 ELSE 0.0 END
            -- Geographic proximity: 0.3 (closer = higher score)
            + 0.3 * (1.0 - LEAST(ST_Distance(l.lost_location, found_rec.found_location) / (max_distance_km * 1000.0), 1.0))
            -- Time proximity: 0.3 (closer in time = higher score)
            + 0.3 * (1.0 - LEAST(EXTRACT(EPOCH FROM (found_rec.found_time - COALESCE(l.lost_time_to, l.lost_time_from, l.created_at))) / 604800.0, 1.0))
        ) AS score
    FROM lost_items l
    WHERE l.status = 'available'
      AND l.category = found_rec.category
      AND ST_DWithin(l.lost_location, found_rec.found_location, max_distance_km * 1000)
    ORDER BY score DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;
