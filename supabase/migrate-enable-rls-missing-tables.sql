-- Enable RLS on tables that were missing it
-- Run in Supabase SQL editor

-- events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events accessible by authenticated users" ON events;
CREATE POLICY "events accessible by authenticated users"
  ON events FOR ALL USING (auth.role() = 'authenticated');

-- set_lists
ALTER TABLE set_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "set_lists accessible by authenticated users" ON set_lists;
CREATE POLICY "set_lists accessible by authenticated users"
  ON set_lists FOR ALL USING (auth.role() = 'authenticated');

-- set_list_songs
ALTER TABLE set_list_songs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "set_list_songs accessible by authenticated users" ON set_list_songs;
CREATE POLICY "set_list_songs accessible by authenticated users"
  ON set_list_songs FOR ALL USING (auth.role() = 'authenticated');

-- songs
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "songs accessible by authenticated users" ON songs;
CREATE POLICY "songs accessible by authenticated users"
  ON songs FOR ALL USING (auth.role() = 'authenticated');

-- tag_options
ALTER TABLE tag_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tag_options accessible by authenticated users" ON tag_options;
CREATE POLICY "tag_options accessible by authenticated users"
  ON tag_options FOR ALL USING (auth.role() = 'authenticated');
