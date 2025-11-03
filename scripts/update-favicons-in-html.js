const fs = require('fs');
const path = require('path');
const glob = require('glob');

const staticPagesDir = path.join(__dirname, '../public/static-pages');

// New favicon HTML
const newFaviconHTML = `<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`;

console.log('🔄 Updating favicons in all HTML files...\n');

// Find all HTML files
const htmlFiles = glob.sync(path.join(staticPagesDir, '*.html'));

console.log(`Found ${htmlFiles.length} HTML files\n`);

let updatedCount = 0;
let skippedCount = 0;

htmlFiles.forEach((filePath) => {
  const fileName = path.basename(filePath);

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove old favicon links
    const oldFaviconPatterns = [
      /<link\s+rel="icon"[^>]*>/gi,
      /<link\s+rel="shortcut icon"[^>]*>/gi,
      /<link\s+rel="apple-touch-icon"[^>]*>/gi,
    ];

    let modified = false;
    oldFaviconPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, '');
        modified = true;
      }
    });

    // Insert new favicon links after <title> tag
    if (content.includes('<title>')) {
      content = content.replace(
        /(<title>.*?<\/title>)/i,
        `$1\n${newFaviconHTML}`
      );
      modified = true;
    }

    if (modified) {
      // Clean up multiple blank lines
      content = content.replace(/\n{3,}/g, '\n\n');

      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${fileName}`);
      updatedCount++;
    } else {
      console.log(`⏭️  ${fileName} (no changes needed)`);
      skippedCount++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${fileName}:`, error.message);
  }
});

console.log(`\n✨ Favicon update complete!`);
console.log(`   Updated: ${updatedCount} files`);
console.log(`   Skipped: ${skippedCount} files`);
console.log(`\n📋 Summary:`);
console.log(`   - Old favicon links removed`);
console.log(`   - New optimized favicons added`);
console.log(`   - All sizes included (16x16, 32x32, 180x180 for Apple)`);
