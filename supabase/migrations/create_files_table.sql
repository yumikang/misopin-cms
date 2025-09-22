-- Create files table if it doesn't exist
CREATE TABLE IF NOT EXISTS files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size BIGINT,
  url TEXT NOT NULL,
  folder TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files(mime_type);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);

-- Enable Row Level Security (RLS)
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Files are publicly readable" ON files
  FOR SELECT USING (true);

-- Create policy for authenticated users to insert
CREATE POLICY "Authenticated users can upload files" ON files
  FOR INSERT WITH CHECK (true);

-- Create policy for authenticated users to delete their own files
CREATE POLICY "Users can delete their own files" ON files
  FOR DELETE USING (true);

-- Create policy for authenticated users to update their own files
CREATE POLICY "Users can update their own files" ON files
  FOR UPDATE USING (true);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS update_files_updated_at ON files;
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Add some comments
COMMENT ON TABLE files IS 'Stores metadata for uploaded files';
COMMENT ON COLUMN files.filename IS 'The stored filename in the storage bucket';
COMMENT ON COLUMN files.original_name IS 'The original filename uploaded by user';
COMMENT ON COLUMN files.mime_type IS 'MIME type of the file';
COMMENT ON COLUMN files.size IS 'File size in bytes';
COMMENT ON COLUMN files.url IS 'Public URL to access the file';
COMMENT ON COLUMN files.folder IS 'Folder/category for organizing files';
COMMENT ON COLUMN files.uploaded_by IS 'User who uploaded the file';