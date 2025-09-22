const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wizlegjvfapykufzrojl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpemxlZ2p2ZmFweWt1Znpyb2psIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODA4MDk4OSwiZXhwIjoyMDczNjU2OTg5fQ.HRknUNazo3GE068z-VwqEOcGqmTMhu__v_RsnhV7SeI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFiles() {
  console.log('📁 Checking all files in database...\n');

  const { data: files, error } = await supabase
    .from('files')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!files || files.length === 0) {
    console.log('No files in database');
    return;
  }

  console.log(`Total files: ${files.length}\n`);
  files.forEach((file, index) => {
    console.log(`${index + 1}. ${file.filename}`);
    console.log(`   URL: ${file.url}`);
    console.log(`   Created: ${file.created_at}`);
    console.log('');
  });

  // Check for problematic URLs
  const problemFiles = files.filter(f =>
    f.url.includes('placeholder') ||
    !f.url.includes('supabase')
  );

  if (problemFiles.length > 0) {
    console.log(`⚠️  Found ${problemFiles.length} files with problematic URLs:`);
    problemFiles.forEach(f => {
      console.log(`  - ${f.filename}: ${f.url}`);
    });
  } else {
    console.log('✅ All files have valid Supabase URLs');
  }
}

checkFiles();