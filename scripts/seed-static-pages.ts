import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const pages = [
  { slug: 'acne', title: '여드름 치료', category: 'skin-care' },
  { slug: 'botox', title: '보톡스', category: 'wrinkle-botox' },
  { slug: 'diet', title: '다이어트', category: 'body-care' },
  { slug: 'filler', title: '필러', category: 'volume-lifting' },
  { slug: 'hair-removal', title: '제모', category: 'removal-procedure' },
  { slug: 'jeomin', title: '제오민', category: 'wrinkle-botox' },
  { slug: 'lifting', title: '리프팅', category: 'volume-lifting' },
  { slug: 'milia', title: '비립종 제거', category: 'removal-procedure' },
  { slug: 'mole', title: '점/사마귀 제거', category: 'removal-procedure' },
  { slug: 'peeling', title: '필링', category: 'skin-care' },
  { slug: 'skinbooster', title: '스킨부스터', category: 'skin-care' },
  { slug: 'tattoo', title: '타투 제거', category: 'removal-procedure' },
];

async function seedStaticPages() {
  console.log('Starting static pages seeding...\n');

  for (const page of pages) {
    const filePath = path.join(
      process.cwd(),
      'public',
      'static-pages',
      `${page.slug}.html`
    );

    // Check if HTML file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      continue;
    }

    try {
      const existing = await prisma.static_pages.findUnique({
        where: { slug: page.slug },
      });

      if (existing) {
        console.log(`✓ ${page.slug} already exists, skipping...`);
        continue;
      }

      await prisma.static_pages.create({
        data: {
          id: `page_${Date.now()}_${page.slug}`,
          slug: page.slug,
          title: page.title,
          filePath: `/static-pages/${page.slug}.html`,
          sections: {},
          editMode: 'ATTRIBUTE', // TipTap 편집 모드
          syncStatus: 'PENDING', // 아직 파싱 안됨
          lastEdited: new Date(),
        },
      });

      console.log(`✓ Created: ${page.title} (${page.slug})`);
    } catch (error) {
      console.error(`✗ Error creating ${page.slug}:`, error);
    }
  }

  console.log('\n✅ Static pages seeding completed!');
}

seedStaticPages()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
