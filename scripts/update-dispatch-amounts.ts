import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateDispatchAmounts() {
  try {
    console.log('Actualizando despachos con información de montos...');
    
    // Obtener todos los despachos sin documentInfo
    const dispatches = await prisma.dispatch.findMany({
      where: {
        documentInfo: null
      }
    });
    
    console.log(`Encontrados ${dispatches.length} despachos sin información de documento`);
    
    // Actualizar cada despacho con información de montos de ejemplo
    for (const dispatch of dispatches) {
      // Generar montos de ejemplo basados en el tipo de documento
      const baseAmount = Math.floor(Math.random() * 1000000) + 100000; // Entre 100k y 1.1M
      const flete = Math.floor(Math.random() * 50000) + 10000; // Entre 10k y 60k
      
      const documentInfo = {
        NumDoc: dispatch.documentNumber,
        TipoDoc: dispatch.documentType,
        CodVend: dispatch.vendorCode,
        MntTotal: baseAmount.toString(),
        MntNeto: Math.floor(baseAmount / 1.19).toString(),
        IVA: Math.floor(baseAmount * 0.19 / 1.19).toString(),
        transporte: flete.toString(),
        flete: flete.toString(),
        NomCliente: dispatch.clienteNombre,
        FchDoc: dispatch.createdAt.toISOString().split('T')[0]
      };
      
      await prisma.dispatch.update({
        where: { id: dispatch.id },
        data: {
          documentInfo: JSON.stringify(documentInfo)
        }
      });
      
      console.log(`Actualizado despacho ${dispatch.documentNumber} con monto total: $${baseAmount.toLocaleString('es-CL')}`);
    }
    
    console.log('✅ Actualización completada');
    
  } catch (error) {
    console.error('Error al actualizar despachos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
updateDispatchAmounts();