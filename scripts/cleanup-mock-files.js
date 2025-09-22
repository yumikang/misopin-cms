/**
 * Clean up mock/placeholder files from database
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://wizlegjvfapykufzrojl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpemxlZ2p2ZmFweWt1Znpyb2psIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODA4MDk4OSwiZXhwIjoyMDczNjU2OTg5fQ.HRknUNazo3GE068z-VwqEOcGqmTMhu__v_RsnhV7SeI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupMockFiles() {
  console.log('🧹 Cleaning up mock/placeholder files...\n');

  try {
    // First, check how many mock files exist
    const { data: mockFiles, error: selectError } = await supabase
      .from('files')
      .select('*')
      .like('url', '%placeholder%');

    if (selectError) {
      console.error('❌ Error fetching mock files:', selectError);
      return;
    }

    if (!mockFiles || mockFiles.length === 0) {
      console.log('✅ No mock files found. Database is clean!');
      return;
    }

    console.log(`Found ${mockFiles.length} mock files to delete:`);
    mockFiles.forEach(file => {
      console.log(`  - ${file.filename} (${file.url})`);
    });

    // Delete all mock files
    const { error: deleteError, count } = await supabase
      .from('files')
      .delete()
      .like('url', '%placeholder%');

    if (deleteError) {
      console.error('❌ Error deleting mock files:', deleteError);
      return;
    }

    console.log(`\n✅ Successfully deleted ${mockFiles.length} mock files!`);

    // Verify remaining files
    const { data: remainingFiles, error: verifyError } = await supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false });

    if (!verifyError && remainingFiles) {
      console.log(`\n📁 Remaining real files (${remainingFiles.length}):`);
      remainingFiles.forEach(file => {
        console.log(`  ✓ ${file.filename} - ${file.url.substring(0, 50)}...`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run cleanup
cleanupMockFiles();