-- Multi-photo support for reports
-- Run: docker exec -i safecircle-postgres psql -U safecircle safecircle < migrations/008_report_photos.sql

-- ============================================
-- Report Photos (up to 5 per report)
-- ============================================
CREATE TABLE IF NOT EXISTS report_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('missing', 'lost', 'found')),
  report_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_photos_report ON report_photos(report_type, report_id);
