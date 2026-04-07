-- Verification claims & resolution stories
-- Run: docker exec -i safecircle-postgres psql -U safecircle safecircle < migrations/002_verification_resolution.sql

-- ============================================
-- Verification Claims
-- ============================================
CREATE TABLE IF NOT EXISTS verification_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('lost_item', 'found_item', 'missing_report')),
  item_id UUID NOT NULL,
  claimant_id UUID NOT NULL REFERENCES users(id),
  questions JSONB NOT NULL DEFAULT '[]',
  answers JSONB,
  score NUMERIC(3,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX idx_claims_item ON verification_claims(item_type, item_id);
CREATE INDEX idx_claims_claimant ON verification_claims(claimant_id);
CREATE INDEX idx_claims_status ON verification_claims(status) WHERE status = 'pending';

-- ============================================
-- Resolution Stories
-- ============================================
CREATE TABLE IF NOT EXISTS resolution_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('missing', 'lost', 'found')),
  report_id UUID NOT NULL,
  resolver_id UUID NOT NULL REFERENCES users(id),
  resolution_type TEXT NOT NULL CHECK (resolution_type IN ('found_safe', 'returned', 'false_alarm', 'other')),
  story TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  city TEXT,
  celebration_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stories_created ON resolution_stories(created_at DESC);
CREATE INDEX idx_stories_report ON resolution_stories(report_type, report_id);
CREATE INDEX idx_stories_resolver ON resolution_stories(resolver_id);
