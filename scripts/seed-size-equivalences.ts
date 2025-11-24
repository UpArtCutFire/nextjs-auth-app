import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSizeEquivalences() {
  console.log('🌱 Inicializando equivalencias de tallas...');

  const defaultEquivalences = [
    { size: 'S' as const, value: 1, description: 'Pequeño' },
    { size: 'M' as const, value: 2, description: 'Mediano' },
    { size: 'L' as const, value: 3, description: 'Grande' },
    { size: 'XL' as const, value: 4, description: 'Extra Grande' },
    { size: 'XXL' as const, value: 10, description: 'Extra Extra Grande' }
  ];

  try {
    // Verificar si ya existen equivalencias
    const existingEquivalences = await prisma.sizeEquivalence.findMany();
    
    if (existingEquivalences.length > 0) {
      console.log('✓ Las equivalencias de tallas ya existen:');
      for (const eq of existingEquivalences) {
        console.log(`  • ${eq.size} = ${eq.value} punto${eq.value !== 1 ? 's' : ''} (${eq.description || 'sin descripción'})`);
      }
      return;
    }

    // Crear equivalencias por defecto
    console.log('📊 Creando equivalencias de tallas por defecto...');
    
    for (const eq of defaultEquivalences) {
      const created = await prisma.sizeEquivalence.create({
        data: eq
      });
      console.log(`✓ Creada talla ${created.size} = ${created.value} punto${created.value !== 1 ? 's' : ''}`);
    }

    console.log('🎉 ¡Equivalencias de tallas inicializadas correctamente!');
  } catch (error) {
    console.error('❌ Error al inicializar equivalencias de tallas:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedSizeEquivalences();
  } catch (error) {
    console.error('Error en el proceso:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si el script se llama directamente
if (require.main === module) {
  main();
}