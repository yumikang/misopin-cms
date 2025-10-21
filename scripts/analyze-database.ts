import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeDatabase() {
  console.log('='.repeat(80));
  console.log('DATABASE ANALYSIS REPORT');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        _count: {
          select: {
            uploadedFiles: true,
            contentVersions: true,
            blockTemplates: true,
          },
        },
      },
    });
    console.log('📊 USERS (' + users.length + ' total)');
    console.log('-'.repeat(80));
    users.forEach((user) => {
      console.log(`  [${user.role}] ${user.name} (${user.email})`);
      console.log(`    Active: ${user.isActive}, Last Login: ${user.lastLogin || 'Never'}`);
      console.log(`    Files: ${user._count.uploadedFiles}, Versions: ${user._count.contentVersions}, Templates: ${user._count.blockTemplates}`);
    });
    console.log('');

    // Reservations
    const reservations = await prisma.reservation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const reservationStats = await prisma.reservation.groupBy({
      by: ['status'],
      _count: true,
    });
    console.log('📅 RESERVATIONS (' + (await prisma.reservation.count()) + ' total)');
    console.log('-'.repeat(80));
    reservationStats.forEach((stat) => {
      console.log(`  ${stat.status}: ${stat._count} reservations`);
    });
    console.log('  Recent 10:');
    reservations.slice(0, 5).forEach((res) => {
      console.log(`    - ${res.patientName} (${res.phone}) - ${res.status} - ${res.service}`);
    });
    console.log('');

    // Popups
    const popups = await prisma.popup.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const activePopups = popups.filter((p) => p.isActive);
    console.log('🔔 POPUPS (' + popups.length + ' total, ' + activePopups.length + ' active)');
    console.log('-'.repeat(80));
    popups.forEach((popup) => {
      console.log(`  [${popup.isActive ? 'ACTIVE' : 'INACTIVE'}] ${popup.title}`);
      console.log(`    Type: ${popup.displayType}, Priority: ${popup.priority}`);
      console.log(`    Period: ${popup.startDate.toISOString().split('T')[0]} ~ ${popup.endDate.toISOString().split('T')[0]}`);
    });
    console.log('');

    // Board Posts
    const boardPosts = await prisma.boardPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const boardStats = await prisma.boardPost.groupBy({
      by: ['boardType', 'isPublished'],
      _count: true,
    });
    console.log('📝 BOARD POSTS (' + (await prisma.boardPost.count()) + ' total)');
    console.log('-'.repeat(80));
    boardStats.forEach((stat) => {
      console.log(`  ${stat.boardType} (${stat.isPublished ? 'Published' : 'Draft'}): ${stat._count} posts`);
    });
    console.log('  Recent 5:');
    boardPosts.slice(0, 5).forEach((post) => {
      console.log(`    - [${post.boardType}] ${post.title} by ${post.author} (Views: ${post.viewCount})`);
    });
    console.log('');

    // Static Pages
    const staticPages = await prisma.staticPage.findMany({
      include: {
        _count: {
          select: { versions: true },
        },
      },
    });
    console.log('🌐 STATIC PAGES (' + staticPages.length + ' total)');
    console.log('-'.repeat(80));
    staticPages.forEach((page) => {
      console.log(`  ${page.slug} - ${page.title}`);
      console.log(`    Path: ${page.filePath}, Versions: ${page._count.versions}`);
    });
    console.log('');

    // Clinic Info
    const clinicInfo = await prisma.clinicInfo.findFirst({
      where: { isActive: true },
    });
    console.log('🏥 CLINIC INFO');
    console.log('-'.repeat(80));
    if (clinicInfo) {
      console.log(`  Phone: ${clinicInfo.phonePrimary}${clinicInfo.phoneSecondary ? ', ' + clinicInfo.phoneSecondary : ''}`);
      console.log(`  Address: ${clinicInfo.addressFull}`);
      console.log(`  Hours - Weekday: ${clinicInfo.hoursWeekday}`);
      console.log(`  Hours - Saturday: ${clinicInfo.hoursSaturday}`);
      console.log(`  Hours - Sunday: ${clinicInfo.hoursSunday}`);
      console.log(`  Business Reg: ${clinicInfo.businessRegistration}`);
      console.log(`  Representative: ${clinicInfo.representativeName}`);
      console.log(`  SNS - Instagram: ${clinicInfo.snsInstagram || 'N/A'}`);
      console.log(`  SNS - Kakao: ${clinicInfo.snsKakao || 'N/A'}`);
    } else {
      console.log('  No active clinic info found');
    }
    console.log('');

    // System Settings
    const systemSettings = await prisma.systemSetting.findMany();
    console.log('⚙️ SYSTEM SETTINGS (' + systemSettings.length + ' total)');
    console.log('-'.repeat(80));
    systemSettings.forEach((setting) => {
      console.log(`  [${setting.category}] ${setting.key}`);
    });
    console.log('');

    // File Uploads
    const fileUploads = await prisma.fileUpload.findMany({
      take: 10,
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploadedBy: {
          select: { name: true },
        },
      },
    });
    const fileStats = await prisma.fileUpload.groupBy({
      by: ['category'],
      _count: true,
      _sum: { size: true },
    });
    console.log('📁 FILE UPLOADS (' + (await prisma.fileUpload.count()) + ' total)');
    console.log('-'.repeat(80));
    fileStats.forEach((stat) => {
      const totalSizeMB = ((stat._sum.size || 0) / 1024 / 1024).toFixed(2);
      console.log(`  ${stat.category}: ${stat._count} files (${totalSizeMB} MB)`);
    });
    console.log('  Recent 5:');
    fileUploads.slice(0, 5).forEach((file) => {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      console.log(`    - ${file.originalName} (${sizeMB} MB) by ${file.uploadedBy.name}`);
    });
    console.log('');

    // Web Builder - Pages
    const pages = await prisma.page.findMany({
      include: {
        _count: {
          select: { pageBlocks: true },
        },
      },
    });
    console.log('📄 WEB BUILDER PAGES (' + pages.length + ' total)');
    console.log('-'.repeat(80));
    pages.forEach((page) => {
      console.log(`  /${page.slug} - ${page.title} (v${page.version})`);
      console.log(`    Published: ${page.isPublished}, Blocks: ${page._count.pageBlocks}`);
    });
    console.log('');

    // Content Blocks
    const contentBlocks = await prisma.contentBlock.findMany({
      include: {
        _count: {
          select: { pageBlocks: true, versions: true },
        },
      },
    });
    const blockStats = await prisma.contentBlock.groupBy({
      by: ['type', 'isGlobal'],
      _count: true,
    });
    console.log('🧩 CONTENT BLOCKS (' + contentBlocks.length + ' total)');
    console.log('-'.repeat(80));
    blockStats.forEach((stat) => {
      console.log(`  ${stat.type} (${stat.isGlobal ? 'Global' : 'Local'}): ${stat._count} blocks`);
    });
    console.log('');

    // Block Templates
    const blockTemplates = await prisma.blockTemplate.findMany({
      include: {
        creator: {
          select: { name: true },
        },
      },
    });
    const templateStats = await prisma.blockTemplate.groupBy({
      by: ['category'],
      _count: true,
    });
    console.log('📐 BLOCK TEMPLATES (' + blockTemplates.length + ' total)');
    console.log('-'.repeat(80));
    templateStats.forEach((stat) => {
      console.log(`  ${stat.category}: ${stat._count} templates`);
    });
    console.log('');

    console.log('='.repeat(80));
    console.log('END OF REPORT');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('Error analyzing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDatabase()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
