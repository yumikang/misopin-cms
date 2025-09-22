/**
 * Supabase Storage Setup Script
 * Run this script to create and configure storage buckets
 *
 * Usage: node scripts/setup-storage.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://wizlegjvfapykufzrojl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpemxlZ2p2ZmFweWt1Znpyb2psIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODA4MDk4OSwiZXhwIjoyMDczNjU2OTg5fQ.HRknUNazo3GE068z-VwqEOcGqmTMhu__v_RsnhV7SeI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  console.log('Setting up Supabase Storage...');

  try {
    // Create 'uploads' bucket if it doesn't exist
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    const uploadsBucketExists = buckets.some(bucket => bucket.name === 'uploads');

    if (!uploadsBucketExists) {
      console.log('Creating uploads bucket...');
      const { data, error } = await supabase.storage.createBucket('uploads', {
        public: true, // Make bucket publicly accessible
        allowedMimeTypes: [
          'image/*',
          'application/pdf',
          'video/*',
          'audio/*'
        ],
        fileSizeLimit: 52428800 // 50MB limit
      });

      if (error) {
        console.error('Error creating bucket:', error);
        return;
      }
      console.log('Uploads bucket created successfully');
    } else {
      console.log('Uploads bucket already exists');
    }

    // Set up bucket policies for public access
    console.log('Setting up bucket policies...');

    // Allow public read access
    const publicReadPolicy = `
      bucket_id = 'uploads'
      AND auth.role() = 'anon'
    `;

    // Note: Policies need to be set through Supabase Dashboard
    // This is just a reference for the policy that should be applied
    console.log(`
Please ensure the following policies are set in Supabase Dashboard:

1. Storage Object Policy for PUBLIC READ:
   - Bucket: uploads
   - Operation: SELECT
   - Policy: true (allow all)

2. Storage Object Policy for AUTHENTICATED UPLOAD:
   - Bucket: uploads
   - Operation: INSERT
   - Policy: true (for now, restrict later with auth)

3. Storage Object Policy for AUTHENTICATED DELETE:
   - Bucket: uploads
   - Operation: DELETE
   - Policy: true (for now, restrict later with auth)
    `);

    // Create folder structure
    console.log('Creating folder structure...');
    const folders = ['images', 'documents', 'videos', 'audio', 'banners', 'profiles', 'treatments', 'gallery'];

    for (const folder of folders) {
      // Create a placeholder file in each folder to ensure folder exists
      const placeholderPath = `${folder}/.keep`;
      const { error } = await supabase.storage
        .from('uploads')
        .upload(placeholderPath, new Blob([''], { type: 'text/plain' }), {
          upsert: true
        });

      if (error) {
        console.error(`Error creating folder ${folder}:`, error.message);
      } else {
        console.log(`✓ Folder created: ${folder}`);
      }
    }

    console.log('\n✅ Storage setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Go to Supabase Dashboard > Storage > Policies');
    console.log('2. Add public read policy for the uploads bucket');
    console.log('3. Test file upload in the CMS');

  } catch (error) {
    console.error('Setup error:', error);
  }
}

// Run the setup
setupStorage();