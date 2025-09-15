import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create admin users
  const adminPassword = await hash("admin123", 12);
  const editorPassword = await hash("editor123", 12);

  // Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@misopin.com" },
    update: {},
    create: {
      email: "admin@misopin.com",
      name: "슈퍼 관리자",
      password: adminPassword,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: "manager@misopin.com" },
    update: {},
    create: {
      email: "manager@misopin.com",
      name: "일반 관리자",
      password: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  // Create Editor
  const editor = await prisma.user.upsert({
    where: { email: "editor@misopin.com" },
    update: {},
    create: {
      email: "editor@misopin.com",
      name: "편집자",
      password: editorPassword,
      role: UserRole.EDITOR,
      isActive: true,
    },
  });

  console.log("✅ Seed data created successfully!");
  console.log({
    superAdmin: { email: superAdmin.email, password: "admin123" },
    admin: { email: admin.email, password: "admin123" },
    editor: { email: editor.email, password: "editor123" },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });