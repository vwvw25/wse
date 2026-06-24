-- Activity log: one row per field change on an event
-- Captures what changed, what it changed from, and when — for full audit trail
CREATE TABLE IF NOT EXISTS event_activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  field text NOT NULL,
  field_label text NOT NULL,
  old_value text,
  new_value text,
  source text NOT NULL, -- 'contract_review' | 'admin_edit'
  changed_at timestamptz DEFAULT now() NOT NULL
);

-- RLS: service role only (same pattern as other tables)
ALTER TABLE event_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON event_activity_log
  USING (true) WITH CHECK (true);
