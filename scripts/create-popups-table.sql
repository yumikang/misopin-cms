-- Create popups table
CREATE TABLE IF NOT EXISTS popups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  image_url TEXT,
  link_url TEXT,
  display_type VARCHAR(50) DEFAULT 'MODAL',
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  show_today_close BOOLEAN DEFAULT true,
  position VARCHAR(50) DEFAULT 'CENTER',
  width INTEGER,
  height INTEGER,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_popups_active ON popups(is_active);
CREATE INDEX IF NOT EXISTS idx_popups_dates ON popups(start_date, end_date);

-- Enable RLS for popups table
ALTER TABLE popups ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (allow Service Role to bypass RLS)
CREATE POLICY "Service role can do everything" ON popups
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON popups TO postgres;
GRANT ALL ON popups TO service_role;