import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPlanificador() {
  try {
    // Check if planificador users exist
    const planificadores = await prisma.user.findMany({
      where: {
        perfil: 'planificador'
      },
      select: {
        id: true,
        nombre: true,
        correo: true,
        perfil: true,
        codigo_vendedor: true,
        activo: true
      }
    });

    console.log('=== Usuarios Planificadores ===');
    if (planificadores.length === 0) {
      console.log('No se encontraron usuarios con perfil planificador');
    } else {
      planificadores.forEach(user => {
        console.log(`\nNombre: ${user.nombre}`);
        console.log(`Correo: ${user.correo}`);
        console.log(`Perfil: ${user.perfil}`);
        console.log(`Código Vendedor: ${user.codigo_vendedor || 'N/A'}`);
        console.log(`Activo: ${user.activo ? 'Sí' : 'No'}`);
      });
    }

    // Check all unique profiles
    const profiles = await prisma.user.findMany({
      select: {
        perfil: true
      },
      distinct: ['perfil']
    });

    console.log('\n=== Perfiles únicos en el sistema ===');
    profiles.forEach(p => console.log(`- ${p.perfil}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPlanificador();