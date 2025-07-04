
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  try {
    // Limpiar datos existentes (opcional)
    await prisma.user.deleteMany();
    console.log('🗑️  Datos anteriores eliminados');

    // Crear usuario administrador
    const adminPassword = await bcrypt.hash('johndoe123', 12);
    const admin = await prisma.user.create({
      data: {
        nombre: 'John Doe',
        correo: 'john@doe.com',
        rut: '12345678-9',
        activo: true,
        perfil: 'administrador',
        codigo_vendedor: 'ADMIN001', // Código para que admin pueda crear verificaciones
        porcentaje_comision: 20.0,
        comision_base: 300000,
        password: adminPassword,
        // Campos NextAuth
        name: 'John Doe',
        email: 'john@doe.com',
      },
    });

    console.log('👤 Usuario administrador creado:', admin.nombre);

    // Crear usuario vendedor
    const vendedorPassword = await bcrypt.hash('vendedor123', 12);
    const vendedor = await prisma.user.create({
      data: {
        nombre: 'María González',
        correo: 'maria@vendedor.com',
        rut: '98765432-1',
        activo: true,
        perfil: 'vendedor',
        codigo_vendedor: 'VEND001',
        porcentaje_comision: 15.5,
        comision_base: 250000,
        password: vendedorPassword,
        // Campos NextAuth
        name: 'María González',
        email: 'maria@vendedor.com',
      },
    });

    console.log('👤 Usuario vendedor creado:', vendedor.nombre);

    // Crear otro vendedor inactivo para ejemplo
    const vendedor2Password = await bcrypt.hash('vendedor456', 12);
    const vendedor2 = await prisma.user.create({
      data: {
        nombre: 'Carlos Pérez',
        correo: 'carlos@vendedor.com',
        rut: '11223344-5',
        activo: false,
        perfil: 'vendedor',
        codigo_vendedor: 'VEND002',
        porcentaje_comision: 12.0,
        comision_base: 200000,
        password: vendedor2Password,
        // Campos NextAuth
        name: 'Carlos Pérez',
        email: 'carlos@vendedor.com',
      },
    });

    console.log('👤 Usuario vendedor inactivo creado:', vendedor2.nombre);

    console.log('✅ Seed completado exitosamente');
    console.log('\n📋 Credenciales de acceso:');
    console.log('Administrador:');
    console.log('  Email: john@doe.com');
    console.log('  Password: johndoe123');
    console.log('\nVendedor:');
    console.log('  Email: maria@vendedor.com');
    console.log('  Password: vendedor123');
    console.log('\nVendedor Inactivo:');
    console.log('  Email: carlos@vendedor.com');
    console.log('  Password: vendedor456');

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
