import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const pagesToRegister = [
  {
    slug: 'about',
    title: '병원 소개',
    filePath: 'about.html',
    category: 'about',
    isPublished: true,
  },
  {
    slug: 'board-page',
    title: '공지 및 이벤트',
    filePath: 'board-page.html',
    category: 'board',
    isPublished: true,
  },
  {
    slug: 'calendar-page',
    title: '상담 예약',
    filePath: 'calendar-page.html',
    category: 'reservation',
    isPublished: true,
  },
];

async function registerPages() {
  console.log('📝 Registering missing pages in database...\n');

  for (const page of pagesToRegister) {
    try {
      // Check if page already exists
      const existing = await prisma.static_pages.findUnique({
        where: { slug: page.slug },
      });

      if (existing) {
        console.log(`⏭️  ${page.slug}: already exists`);
        continue;
      }

      // Create new page
      const newPage = await prisma.static_pages.create({
        data: {
          slug: page.slug,
          title: page.title,
          filePath: page.filePath,
          category: page.category,
          editMode: 'html',
          isPublished: page.isPublished,
          version: 1,
        },
      });

      console.log(`✅ ${page.slug}: registered successfully (ID: ${newPage.id})`);
    } catch (error) {
      console.error(`❌ Error registering ${page.slug}:`, error);
    }
  }

  console.log('\n✨ Page registration complete!');
}

registerPages()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
