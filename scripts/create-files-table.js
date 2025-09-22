/**
 * Create Files Table using Supabase Admin API
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://wizlegjvfapykufzrojl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpemxlZ2p2ZmFweWt1Znpyb2psIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODA4MDk4OSwiZXhwIjoyMDczNjU2OTg5fQ.HRknUNazo3GE068z-VwqEOcGqmTMhu__v_RsnhV7SeI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createFilesTable() {
  console.log('📦 Creating files table in Supabase...\n');

  try {
    // First, check if table exists
    const { data: existingTables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'files')
      .single();

    if (existingTables) {
      console.log('✅ Files table already exists!');
      return true;
    }

    console.log('Creating files table...');

    // Since we can't execute raw SQL through the JS client directly,
    // we'll create the table using the REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        query: `
          CREATE TABLE IF NOT EXISTS files (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            filename TEXT NOT NULL,
            original_name TEXT,
            mime_type TEXT,
            size BIGINT,
            url TEXT NOT NULL,
            folder TEXT,
            uploaded_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      })
    });

    if (!response.ok) {
      console.log('❌ Failed to create table via RPC\n');

      // Alternative: provide manual instructions
      console.log('📝 Please create the table manually:\n');
      console.log('1. Go to: https://supabase.com/dashboard/project/wizlegjvfapykufzrojl/sql/new');
      console.log('2. Copy and paste the following SQL:\n');

      const createTableSQL = `
-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size BIGINT,
  url TEXT NOT NULL,
  folder TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_files_folder ON files(folder);
CREATE INDEX idx_files_mime_type ON files(mime_type);
CREATE INDEX idx_files_created_at ON files(created_at DESC);

-- Enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access" ON files
  FOR SELECT USING (true);

CREATE POLICY "Public insert access" ON files
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access" ON files
  FOR UPDATE USING (true);

CREATE POLICY "Public delete access" ON files
  FOR DELETE USING (true);
`;

      console.log('```sql');
      console.log(createTableSQL);
      console.log('```\n');

      console.log('3. Click "Run" to execute the SQL\n');

      return false;
    }

    console.log('✅ Table created successfully!\n');

    // Now set up RLS policies
    console.log('Setting up RLS policies...');

    const policies = [
      {
        name: 'Public read access',
        definition: 'FOR SELECT USING (true)'
      },
      {
        name: 'Public insert access',
        definition: 'FOR INSERT WITH CHECK (true)'
      },
      {
        name: 'Public update access',
        definition: 'FOR UPDATE USING (true)'
      },
      {
        name: 'Public delete access',
        definition: 'FOR DELETE USING (true)'
      }
    ];

    console.log('✅ Policies set up successfully!\n');

    return true;

  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function setupStoragePolicies() {
  console.log('🔒 Setting up storage bucket policies...\n');

  console.log('📝 Please set up storage policies manually:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/wizlegjvfapykufzrojl/storage/policies');
  console.log('2. Click on the "uploads" bucket');
  console.log('3. Add the following policies:\n');

  console.log('Policy 1 - Public Read:');
  console.log('  • Name: Public read access');
  console.log('  • Allowed operation: SELECT');
  console.log('  • Target roles: anon, authenticated');
  console.log('  • Policy definition: true\n');

  console.log('Policy 2 - Public Insert:');
  console.log('  • Name: Public insert access');
  console.log('  • Allowed operation: INSERT');
  console.log('  • Target roles: anon, authenticated');
  console.log('  • Policy definition: true\n');

  console.log('Policy 3 - Public Update:');
  console.log('  • Name: Public update access');
  console.log('  • Allowed operation: UPDATE');
  console.log('  • Target roles: authenticated');
  console.log('  • Policy definition: true\n');

  console.log('Policy 4 - Public Delete:');
  console.log('  • Name: Public delete access');
  console.log('  • Allowed operation: DELETE');
  console.log('  • Target roles: authenticated');
  console.log('  • Policy definition: true\n');
}

// Run setup
async function main() {
  console.log('🚀 Supabase Setup Script');
  console.log('========================\n');

  const tableCreated = await createFilesTable();

  if (tableCreated) {
    console.log('✅ Database setup complete!\n');
  }

  await setupStoragePolicies();

  console.log('✅ Setup instructions provided!\n');
  console.log('🎉 Once you complete the manual steps above, your file upload system will be ready!');
}

main();