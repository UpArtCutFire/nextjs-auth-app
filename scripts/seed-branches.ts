import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const branches = [
  {
    nombre: 'Sucursal Centro',
    direccion: 'Av. Libertador Bernardo O\'Higgins 1234, Santiago Centro',
    telefono: '+56 2 1234 5678'
  },
  {
    nombre: 'Sucursal Las Condes',
    direccion: 'Av. Apoquindo 4500, Las Condes, Santiago',
    telefono: '+56 2 2345 6789'
  },
  {
    nombre: 'Sucursal Providencia',
    direccion: 'Av. Providencia 2000, Providencia, Santiago',
    telefono: '+56 2 3456 7890'
  },
  {
    nombre: 'Sucursal Maipú',
    direccion: 'Av. Pajaritos 3000, Maipú, Santiago',
    telefono: '+56 2 4567 8901'
  },
  {
    nombre: 'Sucursal Valparaíso',
    direccion: 'Calle Condell 1500, Valparaíso',
    telefono: '+56 32 567 8901'
  }
];

async function seedBranches() {
  console.log('🏢 Iniciando seed de sucursales...');

  try {
    for (const branch of branches) {
      const existingBranch = await prisma.branch.findUnique({
        where: { nombre: branch.nombre }
      });

      if (!existingBranch) {
        await prisma.branch.create({
          data: branch
        });
        console.log(`✅ Sucursal "${branch.nombre}" creada`);
      } else {
        console.log(`⚠️ Sucursal "${branch.nombre}" ya existe`);
      }
    }

    const totalBranches = await prisma.branch.count();
    console.log(`🎉 Seed de sucursales completado. Total: ${totalBranches} sucursales`);

  } catch (error) {
    console.error('❌ Error en seed de sucursales:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el seed si es llamado directamente
if (require.main === module) {
  seedBranches().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export default seedBranches;