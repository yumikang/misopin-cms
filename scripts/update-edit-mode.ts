import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateEditMode() {
  try {
    console.log('🔄 Updating editMode to ATTRIBUTE for all static pages...\n');

    // Update all pages to ATTRIBUTE mode
    const result = await prisma.static_pages.updateMany({
      data: {
        editMode: 'ATTRIBUTE',
      },
    });

    console.log(`✅ Updated ${result.count} pages to ATTRIBUTE mode\n`);

    // Verify the update
    const pages = await prisma.static_pages.findMany({
      select: {
        slug: true,
        title: true,
        editMode: true,
      },
    });

    console.log('📋 Current editMode status:');
    pages.forEach((page) => {
      console.log(`  - ${page.title} (${page.slug}): ${page.editMode}`);
    });

    console.log('\n✨ All pages are now in ATTRIBUTE mode!');
  } catch (error) {
    console.error('❌ Error updating editMode:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateEditMode();
