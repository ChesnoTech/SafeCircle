-- Email verification codes
-- Run: docker exec -i safecircle-postgres psql -U safecircle safecircle < migrations/004_email_verification.sql

-- ============================================
-- Email Verification Codes
-- ============================================
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_user_code
  ON email_verifications(user_id, code);
