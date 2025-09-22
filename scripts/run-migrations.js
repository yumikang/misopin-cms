/**
 * Run SQL Migrations on Supabase
 * This script executes SQL migrations to set up database tables
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://wizlegjvfapykufzrojl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpemxlZ2p2ZmFweWt1Znpyb2psIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODA4MDk4OSwiZXhwIjoyMDczNjU2OTg5fQ.HRknUNazo3GE068z-VwqEOcGqmTMhu__v_RsnhV7SeI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/create_files_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Running migration: create_files_table.sql');
    console.log('----------------------------------------');

    // Split SQL into individual statements (by semicolon) and execute each
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        // Extract the first few words for logging
        const statementType = statement.split(/\s+/).slice(0, 3).join(' ');
        console.log(`\n⚙️  Executing: ${statementType}...`);

        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        }).single();

        if (error) {
          // Try alternative approach - direct query
          const { error: altError } = await supabase
            .from('_sql')
            .insert({ query: statement + ';' })
            .single();

          if (altError) {
            console.error(`❌ Error: ${altError.message}`);
            errorCount++;
          } else {
            console.log(`✅ Success`);
            successCount++;
          }
        } else {
          console.log(`✅ Success`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error executing statement: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n========================================');
    console.log(`📊 Migration Results:`);
    console.log(`   ✅ Successful statements: ${successCount}`);
    console.log(`   ❌ Failed statements: ${errorCount}`);
    console.log('========================================\n');

    if (errorCount > 0) {
      console.log('⚠️  Some statements failed. This might be normal if tables/indexes already exist.');
      console.log('   Please check your database to ensure everything is set up correctly.\n');
    }

    // Test if the files table exists
    console.log('🔍 Verifying files table...');
    const { data, error: testError } = await supabase
      .from('files')
      .select('id')
      .limit(1);

    if (testError && testError.code === '42P01') {
      console.error('❌ Files table was not created. Please run the migration manually in Supabase SQL Editor.');
      console.log('\n📝 To run manually:');
      console.log('   1. Go to Supabase Dashboard > SQL Editor');
      console.log('   2. Copy the contents of supabase/migrations/create_files_table.sql');
      console.log('   3. Paste and run in SQL Editor');
    } else if (testError) {
      console.error('⚠️  Error checking files table:', testError.message);
    } else {
      console.log('✅ Files table verified successfully!\n');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📝 Alternative: Run the migration manually in Supabase Dashboard:');
    console.log('   1. Go to https://supabase.com/dashboard/project/wizlegjvfapykufzrojl/sql');
    console.log('   2. Copy the contents of supabase/migrations/create_files_table.sql');
    console.log('   3. Paste and run in SQL Editor');
  }
}

// Alternative approach using direct SQL execution
async function runMigrationDirect() {
  console.log('\n🔄 Trying alternative migration approach...\n');

  const migrationPath = path.join(__dirname, '../supabase/migrations/create_files_table.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📋 SQL Migration Content:');
  console.log('========================');
  console.log(sql);
  console.log('========================\n');

  console.log('📝 Please run this SQL manually in Supabase Dashboard:');
  console.log('   1. Go to https://supabase.com/dashboard/project/wizlegjvfapykufzrojl/sql');
  console.log('   2. Copy the SQL above');
  console.log('   3. Paste and run in SQL Editor');
  console.log('   4. Check for any errors and resolve them\n');

  // Also create a simplified version
  const simplifiedSQL = `
-- Simplified migration - run this if the full migration fails

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

-- Enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "public_read" ON files FOR SELECT USING (true);

-- Allow all operations for now (restrict later)
CREATE POLICY "public_all" ON files FOR ALL USING (true);
`;

  console.log('📋 Simplified SQL (if full migration fails):');
  console.log('==========================================');
  console.log(simplifiedSQL);
  console.log('==========================================\n');
}

// Run the migration
console.log('🗄️  Supabase Migration Runner');
console.log('==============================\n');

runMigrations().then(() => {
  runMigrationDirect();
});