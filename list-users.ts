import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, nombre: true, correo: true, perfil: true, activo: true }
  });
  console.log(JSON.stringify(users, null, 2));
}
main().finally(() => prisma.$disconnect());
