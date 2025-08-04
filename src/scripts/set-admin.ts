import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

async function setAdmin(email: string) {
  await prisma.user.update({
    where: { email },
    data: { role: "admin" },
  });
  console.log(`User ${email} set to admin`);
}

setAdmin("admin@example.com").then(() => prisma.$disconnect());