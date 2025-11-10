import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const pagesToRegister = [
  {
    slug: 'privacy',
    title: '개인정보처리방침',
    filePath: 'privacy.html',
    category: 'policy',
    isPublished: true,
  },
  {
    slug: 'stipulation',
    title: '이용약관',
    filePath: 'stipulation.html',
    category: 'policy',
    isPublished: true,
  },
  {
    slug: 'fee-schedule',
    title: '비급여 수가표',
    filePath: 'fee-schedule.html',
    category: 'info',
    isPublished: true,
  },
  {
    slug: 'quickmenu',
    title: '퀵메뉴',
    filePath: 'quickmenu.html',
    category: 'utility',
    isPublished: true,
  },
];

async function registerPages() {
  console.log('📝 Registering additional pages in database...\n');

  for (const page of pagesToRegister) {
    try {
      const existing = await prisma.static_pages.findUnique({
        where: { slug: page.slug },
      });

      if (existing) {
        console.log(`⏭️  ${page.slug}: already exists`);
        continue;
      }

      const newPage = await prisma.static_pages.create({
        data: {
          id: crypto.randomUUID(),
          slug: page.slug,
          title: page.title,
          filePath: page.filePath,
          sections: [],
          lastEdited: new Date(),
          editMode: 'PARSER',
          version: 1,
        },
      });

      console.log(`✅ ${page.slug}: registered successfully (ID: ${newPage.id})`);
    } catch (error) {
      console.error(`❌ Error registering ${page.slug}:`, error);
    }
  }

  console.log('\n✨ Additional page registration complete!');
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
