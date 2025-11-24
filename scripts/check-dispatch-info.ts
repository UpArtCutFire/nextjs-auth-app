import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDispatchInfo() {
  try {
    console.log('Verificando información de despachos...\n');
    
    // Obtener despachos con documentInfo
    const dispatchesWithInfo = await prisma.dispatch.findMany({
      where: {
        documentInfo: {
          not: null
        }
      },
      take: 3
    });
    
    console.log(`Despachos con información de documento: ${dispatchesWithInfo.length}\n`);
    
    for (const dispatch of dispatchesWithInfo) {
      console.log(`Despacho ${dispatch.documentNumber}:`);
      if (dispatch.documentInfo) {
        try {
          const info = JSON.parse(dispatch.documentInfo);
          console.log(`  - Monto Total: $${parseInt(info.MntTotal).toLocaleString('es-CL')}`);
          console.log(`  - Transporte/Flete: $${parseInt(info.transporte || info.flete || '0').toLocaleString('es-CL')}`);
          const fleteNeto = parseInt(info.transporte || info.flete || '0') / 1.19;
          const montoNetoSinDespacho = parseInt(info.MntTotal) - fleteNeto;
          console.log(`  - Monto Neto sin Despacho: $${Math.round(montoNetoSinDespacho).toLocaleString('es-CL')}`);
        } catch (e) {
          console.log('  - Error al parsear documentInfo');
        }
      }
      console.log('');
    }
    
    // Obtener despachos sin documentInfo
    const dispatchesWithoutInfo = await prisma.dispatch.count({
      where: {
        documentInfo: null
      }
    });
    
    console.log(`Despachos SIN información de documento: ${dispatchesWithoutInfo}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDispatchInfo();