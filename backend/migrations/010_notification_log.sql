-- Notification log: track all notifications sent to users
CREATE TABLE IF NOT EXISTS notification_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  type          VARCHAR(50) NOT NULL DEFAULT 'alert',
  report_id     UUID,
  report_type   VARCHAR(50),
  tier          VARCHAR(20),
  read          BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_log_user ON notification_log(user_id, created_at DESC);
CREATE INDEX idx_notification_log_unread ON notification_log(user_id, read) WHERE read = false;
