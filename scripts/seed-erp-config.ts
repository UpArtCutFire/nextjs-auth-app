import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Insertando configuración ERP inicial...');
  
  try {
    // Verificar si ya existe una configuración
    const existingConfig = await prisma.eRPConfig.findFirst();
    
    if (existingConfig) {
      console.log('Ya existe una configuración ERP en la base de datos');
      return;
    }
    
    // Crear la configuración inicial con los valores actuales
    const config = await prisma.eRPConfig.create({
      data: {
        txtrutempresa: '77261114-5',
        txtusuario: '18221084-6',
        txtpwd: 'Rguz0608'
      }
    });
    
    console.log('Configuración ERP creada exitosamente:', config);
  } catch (error) {
    console.error('Error insertando configuración ERP:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();