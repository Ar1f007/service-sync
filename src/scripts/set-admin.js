const { PrismaClient } = require("../../src/generated/prisma/client");

const prisma = new PrismaClient();

async function setAdmin(email) {
  await prisma.user.update({
    where: { email },
    data: { role: "admin" },
  });
  console.log(`User ${email} set to admin`);
}

setAdmin("admin@gmail.com").then(() => prisma.$disconnect());