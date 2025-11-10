const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createFavicon() {
  const sourceSvg = '/Users/blee/Desktop/cms/Misopin-renew/img/misopin-logo.svg';
  const outputDir = path.join(__dirname, '../public/static-pages');

  console.log('📸 Creating favicon from misopin-logo.svg...\n');

  // Check if source exists
  if (!fs.existsSync(sourceSvg)) {
    console.error('❌ Source SVG not found:', sourceSvg);
    process.exit(1);
  }

  // Convert SVG to PNG buffer first (since SVG is huge)
  console.log('🔄 Step 1: Converting SVG to PNG buffer...');
  const pngBuffer = await sharp(sourceSvg, { density: 300 })
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  console.log('✅ PNG buffer created\n');

  // Create different sizes
  const sizes = [
    { size: 180, name: 'apple-touch-icon.png', desc: 'Apple Touch Icon' },
    { size: 192, name: 'android-chrome-192x192.png', desc: 'Android Chrome' },
    { size: 512, name: 'android-chrome-512x512.png', desc: 'Android Chrome Large' },
    { size: 32, name: 'favicon-32x32.png', desc: 'Favicon 32x32' },
    { size: 16, name: 'favicon-16x16.png', desc: 'Favicon 16x16' },
  ];

  console.log('🖼️  Step 2: Creating favicon sizes...\n');

  for (const { size, name, desc } of sizes) {
    const outputPath = path.join(outputDir, name);

    await sharp(pngBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`✅ ${desc.padEnd(25)} → ${name.padEnd(30)} (${(stats.size / 1024).toFixed(1)}KB)`);
  }

  // Create favicon.ico (multi-size ICO file)
  console.log('\n🔄 Step 3: Creating favicon.ico...');
  const icoPath = path.join(outputDir, 'favicon.ico');

  // For ICO, we'll create a 32x32 and 16x16 combined file
  // Since sharp doesn't support ICO directly, we'll create a 32x32 PNG and rename it
  await sharp(pngBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(icoPath.replace('.ico', '-temp.png'));

  // For now, use the 32x32 as ICO (browsers will accept PNG as ICO)
  fs.renameSync(icoPath.replace('.ico', '-temp.png'), icoPath);

  const icoStats = fs.statSync(icoPath);
  console.log(`✅ Favicon ICO created      → favicon.ico (${(icoStats.size / 1024).toFixed(1)}KB)`);

  // Copy optimized SVG
  console.log('\n🔄 Step 4: Creating optimized SVG...');
  const svgOutputPath = path.join(outputDir, 'favicon.svg');

  // Create a smaller SVG version from PNG
  await sharp(pngBuffer)
    .resize(64, 64)
    .png()
    .toFile(svgOutputPath.replace('.svg', '-64.png'));

  // For now, copy the original (you may want to use SVGO to optimize)
  fs.copyFileSync(sourceSvg, svgOutputPath);
  const svgStats = fs.statSync(svgOutputPath);
  console.log(`✅ SVG favicon created      → favicon.svg (${(svgStats.size / 1024 / 1024).toFixed(2)}MB - original)`);

  console.log('\n✨ All favicons created successfully!');
  console.log('\n📝 Update your HTML <head> section with:');
  console.log(`
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
  `);
}

createFavicon().catch(console.error);
