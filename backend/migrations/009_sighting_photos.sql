-- Extend report_photos to support sighting photos
-- Run: docker exec -i safecircle-postgres psql -U safecircle safecircle < migrations/009_sighting_photos.sql

-- Allow 'sighting' as a report_type in report_photos
ALTER TABLE report_photos DROP CONSTRAINT IF EXISTS report_photos_report_type_check;
ALTER TABLE report_photos ADD CONSTRAINT report_photos_report_type_check
  CHECK (report_type IN ('missing', 'lost', 'found', 'sighting'));
