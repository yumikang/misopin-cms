import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
});

async function main() {
  try {
    console.log('📋 Checking all registered static pages...\n');

    const pages = await prisma.staticPage.findMany({
      orderBy: { slug: 'asc' },
      select: {
        slug: true,
        title: true,
        filePath: true,
        _count: {
          select: { elements: true }
        }
      }
    });

    console.log(`Found ${pages.length} registered pages:\n`);

    pages.forEach((page, idx) => {
      console.log(`${idx + 1}. ${page.slug}`);
      console.log(`   Title: ${page.title}`);
      console.log(`   Path: ${page.filePath}`);
      console.log(`   Editable elements: ${page._count.elements}`);
      console.log('');
    });

    // Check which HTML files exist but are NOT registered
    console.log('\n🔍 Checking for HTML files in static-pages directory...');
    const { readdir } = await import('fs/promises');
    const htmlFiles = (await readdir('/var/www/misopin-cms/.next/standalone/public/static-pages'))
      .filter(f => f.endsWith('.html'))
      .map(f => f.replace('.html', ''));

    const registeredSlugs = pages.map(p => p.slug);
    const unregistered = htmlFiles.filter(slug => !registeredSlugs.includes(slug));

    if (unregistered.length > 0) {
      console.log(`\n⚠️  Found ${unregistered.length} HTML files NOT registered in CMS:`);
      unregistered.forEach(slug => console.log(`   - ${slug}.html`));
    } else {
      console.log('\n✅ All HTML files are registered in CMS!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
