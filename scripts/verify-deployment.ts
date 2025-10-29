import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDeployment() {
  console.log('🔍 Verifying deployment...\n');

  // Check pages
  const pages = await prisma.static_pages.findMany({
    include: {
      _count: {
        select: { editable_elements: true },
      },
    },
  });

  console.log(`✓ Pages found: ${pages.length}\n`);
  console.log('Page Status:');
  console.log('-'.repeat(70));

  for (const page of pages) {
    const status = page.syncStatus === 'SYNCED' ? '✓' : '⚠️';
    console.log(
      `${status} ${page.slug.padEnd(20)} | ${String(page._count.editable_elements).padStart(3)} elements | ${page.syncStatus}`
    );
  }

  // Check total elements
  const totalElements = await prisma.editable_elements.count();
  console.log('\n' + '='.repeat(70));
  console.log(`✓ Total elements in database: ${totalElements}`);

  // Check element types
  const byType = await prisma.editable_elements.groupBy({
    by: ['elementType'],
    _count: true,
  });

  console.log('\nElements by type:');
  console.log('-'.repeat(70));
  byType.forEach((group) => {
    console.log(`  ${group.elementType.padEnd(15)} | ${String(group._count).padStart(3)} elements`);
  });

  // Check sections
  const bySections = await prisma.editable_elements.groupBy({
    by: ['sectionName'],
    _count: true,
  });

  console.log('\nElements by section:');
  console.log('-'.repeat(70));
  bySections
    .sort((a, b) => (b._count || 0) - (a._count || 0))
    .forEach((group) => {
      const sectionName = group.sectionName || '(no section)';
      console.log(`  ${sectionName.padEnd(25)} | ${String(group._count).padStart(3)} elements`);
    });

  // Check sync status
  const syncedPages = pages.filter(p => p.syncStatus === 'SYNCED').length;
  const pendingPages = pages.filter(p => p.syncStatus === 'PENDING').length;

  console.log('\n' + '='.repeat(70));
  console.log('Sync Status Summary:');
  console.log(`  ✓ Synced:  ${syncedPages}/${pages.length} pages`);
  console.log(`  ⚠️  Pending: ${pendingPages}/${pages.length} pages`);

  if (syncedPages === pages.length && totalElements > 0) {
    console.log('\n✅ All pages are synced and have editable elements!');
  } else if (pendingPages > 0) {
    console.log('\n⚠️  Some pages need to be parsed. Run: npm run db:parse:initial');
  } else {
    console.log('\n⚠️  Verification completed with warnings.');
  }

  console.log('='.repeat(70));
}

verifyDeployment()
  .catch((e) => {
    console.error('Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
