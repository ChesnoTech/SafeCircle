-- Device tokens for push notifications + user roles
-- Run: docker exec -i safecircle-postgres psql -U safecircle safecircle < migrations/003_device_tokens_and_roles.sql

-- ============================================
-- Device Tokens (FCM push notifications)
-- ============================================
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  language TEXT NOT NULL DEFAULT 'en',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_active ON device_tokens(active) WHERE active = true;

-- ============================================
-- Notification Preferences
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  missing_persons BOOLEAN NOT NULL DEFAULT true,
  lost_found BOOLEAN NOT NULL DEFAULT true,
  intel BOOLEAN NOT NULL DEFAULT false,
  radius_km INTEGER NOT NULL DEFAULT 10,
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Add role column to users (default: citizen)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'citizen'
      CHECK (role IN ('citizen', 'moderator', 'officer', 'authority', 'admin'));
  END IF;
END
$$;

-- ============================================
-- Add color/brand to lost_items and found_items
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lost_items' AND column_name = 'color'
  ) THEN
    ALTER TABLE lost_items ADD COLUMN color TEXT;
    ALTER TABLE lost_items ADD COLUMN brand TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'found_items' AND column_name = 'color'
  ) THEN
    ALTER TABLE found_items ADD COLUMN color TEXT;
    ALTER TABLE found_items ADD COLUMN brand TEXT;
  END IF;
END
$$;
