-- Credibility scoring system
-- Run: docker exec -i safecircle-postgres psql -U safecircle safecircle < migrations/005_credibility.sql

-- ============================================
-- Credibility Events
-- ============================================
CREATE TABLE IF NOT EXISTS credibility_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL CHECK (
    event_type IN (
      'report_created',
      'sighting_confirmed',
      'item_returned',
      'person_found',
      'false_report',
      'verified_claim',
      'report_resolved',
      'community_flag'
    )
  ),
  points INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credibility_user_created ON credibility_events(user_id, created_at DESC);
