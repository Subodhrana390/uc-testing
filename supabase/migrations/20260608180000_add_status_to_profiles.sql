ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
