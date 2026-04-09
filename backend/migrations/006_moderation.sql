-- Content moderation: flags + actions
-- Run: docker exec -i safecircle-postgres psql -U safecircle safecircle < migrations/006_moderation.sql

-- ============================================
-- Content Flags (user-submitted reports)
-- ============================================
CREATE TABLE IF NOT EXISTS content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR NOT NULL CHECK (content_type IN (
    'missing_report', 'lost_item', 'found_item', 'intel_report', 'sighting'
  )),
  content_id UUID NOT NULL,
  reason VARCHAR NOT NULL CHECK (reason IN (
    'false_info', 'spam', 'inappropriate', 'duplicate', 'dangerous', 'other'
  )),
  details TEXT,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewed', 'actioned', 'dismissed'
  )),
  reviewer_id UUID REFERENCES users(id),
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_content_flags_content ON content_flags (content_type, content_id);
CREATE INDEX idx_content_flags_status ON content_flags (status);
CREATE INDEX idx_content_flags_reporter ON content_flags (reporter_id);

-- ============================================
-- Content Actions (moderator actions on flags)
-- ============================================
CREATE TABLE IF NOT EXISTS content_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES content_flags(id) ON DELETE CASCADE,
  action_type VARCHAR NOT NULL CHECK (action_type IN (
    'hide', 'warn', 'remove', 'ban_user'
  )),
  performed_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_actions_flag ON content_actions (flag_id);

-- ============================================
-- Add banned_at column to users (soft-ban)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'banned_at'
  ) THEN
    ALTER TABLE users ADD COLUMN banned_at TIMESTAMPTZ;
  END IF;
END
$$;
