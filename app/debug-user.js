
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'john@doe.com' },
      select: {
        id: true,
        correo: true,
        email: true,
        nombre: true,
        perfil: true,
        codigo_vendedor: true,
        activo: true
      }
    });
    
    console.log('Usuario encontrado:', JSON.stringify(user, null, 2));
    
    if (user) {
      console.log('🔍 Análisis del usuario:');
      console.log('- ID:', user.id);
      console.log('- Correo:', user.correo);
      console.log('- Email (NextAuth):', user.email);
      console.log('- Nombre:', user.nombre);
      console.log('- Perfil:', user.perfil);
      console.log('- Código Vendedor:', user.codigo_vendedor);
      console.log('- Activo:', user.activo);
      
      if (!user.codigo_vendedor) {
        console.log('❌ PROBLEMA: El usuario NO tiene codigo_vendedor asignado');
      } else {
        console.log('✅ El usuario SÍ tiene codigo_vendedor asignado');
      }
    } else {
      console.log('❌ Usuario no encontrado');
    }
  } catch (error) {
    console.error('Error al consultar usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
