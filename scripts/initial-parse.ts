import * as fs from 'fs';
import * as path from 'path';
import { parseEditableAttributes } from '../lib/static-pages/attribute-parser';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const slugs = [
  'acne', 'botox', 'diet', 'filler',
  'hair-removal', 'jeomin', 'lifting', 'milia',
  'mole', 'peeling', 'skinbooster', 'tattoo'
];

async function initialParse() {
  console.log('Starting initial parse for all pages...\n');

  let totalElements = 0;
  let successCount = 0;

  for (const slug of slugs) {
    console.log(`\n=== Parsing ${slug}.html ===`);

    // Read HTML file
    const filePath = path.join(
      process.cwd(),
      'public',
      'static-pages',
      `${slug}.html`
    );

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      continue;
    }

    const html = fs.readFileSync(filePath, 'utf-8');

    // Parse with attribute parser
    const result = parseEditableAttributes(html, {
      includeBackgrounds: true,
      includeImages: true,
      validateAttributes: true,
      strictMode: false,
    });

    if (!result.success) {
      console.error(`✗ Parse failed: ${result.error}`);
      continue;
    }

    console.log(`✓ Parsed ${result.elements.length} elements`);

    // Get page from database
    const page = await prisma.static_pages.findUnique({
      where: { slug },
    });

    if (!page) {
      console.warn(`⚠️  Page not found in database: ${slug}`);
      continue;
    }

    // Transaction: Delete old elements and insert new ones
    try {
      await prisma.$transaction(async (tx) => {
        // Delete existing elements
        await tx.editable_elements.deleteMany({
          where: { pageId: page.id },
        });

        // Insert new elements
        for (const element of result.elements) {
          await tx.editable_elements.create({
            data: {
              id: `elem_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              pageId: page.id,
              elementId: element.id,
              elementType: element.type,
              selector: element.selector,
              label: element.label,
              currentValue: element.currentValue,
              sectionName: element.sectionName,
              order: element.order,
            },
          });
        }

        // Update page status
        await tx.static_pages.update({
          where: { id: page.id },
          data: {
            lastParsedAt: new Date(),
            syncStatus: 'SYNCED',
            lastSyncedAt: new Date(),
          },
        });
      });

      console.log(`✓ Synced to database: ${result.elements.length} elements`);
      totalElements += result.elements.length;
      successCount++;

      if (result.warnings && result.warnings.length > 0) {
        console.log(`⚠️  Warnings: ${result.warnings.length}`);
        result.warnings.forEach(w => console.log(`   - ${w}`));
      }
    } catch (error) {
      console.error(`✗ Transaction failed for ${slug}:`, error);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Initial parse completed!');
  console.log(`   Pages processed: ${successCount}/${slugs.length}`);
  console.log(`   Total elements: ${totalElements}`);
  console.log('='.repeat(50));
}

initialParse()
  .catch((e) => {
    console.error('Initial parse failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
