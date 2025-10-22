import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pages = await prisma.static_pages.findMany({
    where: {
      slug: {
        in: ['privacy', 'stipulation']
      }
    }
  });

  for (const page of pages) {
    const sections = page.sections as any[];
    console.log(`\n========== ${page.title} (${page.slug}) ==========`);
    console.log(`총 섹션 개수: ${sections.length}`);
    console.log('\n처음 10개 섹션:');
    sections.slice(0, 10).forEach((section, idx) => {
      console.log(`\n${idx + 1}. [${section.label}]`);
      console.log(`   ID: ${section.id}`);
      console.log(`   Preview: ${section.preview?.substring(0, 60)}...`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
