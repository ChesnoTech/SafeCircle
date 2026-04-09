-- Secure in-app messaging between finders/reporters
-- Run: docker exec -i safecircle-postgres psql -U safecircle safecircle < migrations/007_messaging.sql

-- ============================================
-- Conversations
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(10) NOT NULL CHECK (report_type IN ('missing', 'lost', 'found')),
  report_id UUID NOT NULL,
  participant_a UUID NOT NULL REFERENCES users(id),
  participant_b UUID NOT NULL REFERENCES users(id),
  status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate threads for the same report between the same two users
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique_thread
  ON conversations (report_type, report_id, LEAST(participant_a, participant_b), GREATEST(participant_a, participant_b));

CREATE INDEX IF NOT EXISTS idx_conversations_participant_a ON conversations(participant_a);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_b ON conversations(participant_b);

-- ============================================
-- Messages
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL CHECK (char_length(body) <= 2000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);
