import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extender el tipo jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: any;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que solo administradores puedan acceder
    const userProfile = (session.user as any)?.perfil;
    const isAdmin = userProfile === 'administrador' || 
                   session.user?.email === 'john@doe.com' || 
                   session.user?.email === 'admin@test.com';
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acceso denegado - Solo administradores' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Fechas de inicio y fin son requeridas' }, { status: 400 });
    }

    // Convertir fechas
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Obtener datos para el reporte
    const dispatches = await prisma.dispatch.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        transport: true,
        branch: true,
        user: {
          select: {
            nombre: true,
            correo: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calcular métricas para el reporte
    const totalDispatches = dispatches.length;
    
    const dispatchesByType = {
      RETIRO_LOCAL: dispatches.filter(d => d.tipoDespacho === 'RETIRO_LOCAL').length,
      COURIER: dispatches.filter(d => d.tipoDespacho === 'COURIER').length,
      DESPACHO: dispatches.filter(d => d.tipoDespacho === 'DESPACHO').length
    };

    const dispatchesByStatus = {
      PENDING: dispatches.filter(d => d.status === 'PENDING').length,
      SCHEDULED: dispatches.filter(d => d.status === 'SCHEDULED').length,
      IN_TRANSIT: dispatches.filter(d => d.status === 'IN_TRANSIT').length,
      DELIVERED: dispatches.filter(d => d.status === 'DELIVERED').length,
      CANCELLED: dispatches.filter(d => d.status === 'CANCELLED').length
    };

    // Crear PDF
    const doc = new jsPDF();

    // Configurar fuente para soporte de caracteres especiales
    doc.setFont('helvetica');

    // Título del reporte
    doc.setFontSize(20);
    doc.text('Reporte de Despachos', 20, 30);

    // Período del reporte
    doc.setFontSize(12);
    const formattedStartDate = start.toLocaleDateString('es-CL');
    const formattedEndDate = end.toLocaleDateString('es-CL');
    doc.text(`Período: ${formattedStartDate} - ${formattedEndDate}`, 20, 45);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-CL')} a las ${new Date().toLocaleTimeString('es-CL')}`, 20, 55);

    // Resumen ejecutivo
    doc.setFontSize(16);
    doc.text('Resumen Ejecutivo', 20, 75);
    
    doc.setFontSize(12);
    let yPosition = 90;
    doc.text(`Total de Despachos: ${totalDispatches}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Entregas Completadas: ${dispatchesByStatus.DELIVERED}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Tasa de Completitud: ${totalDispatches > 0 ? ((dispatchesByStatus.DELIVERED / totalDispatches) * 100).toFixed(1) : 0}%`, 20, yPosition);
    yPosition += 20;

    // Distribución por tipo
    doc.setFontSize(16);
    doc.text('Distribución por Tipo de Despacho', 20, yPosition);
    yPosition += 15;

    const typeData = [
      ['Tipo', 'Cantidad', 'Porcentaje'],
      ['Retiro Local', dispatchesByType.RETIRO_LOCAL.toString(), `${totalDispatches > 0 ? ((dispatchesByType.RETIRO_LOCAL / totalDispatches) * 100).toFixed(1) : 0}%`],
      ['Courier', dispatchesByType.COURIER.toString(), `${totalDispatches > 0 ? ((dispatchesByType.COURIER / totalDispatches) * 100).toFixed(1) : 0}%`],
      ['Despacho', dispatchesByType.DESPACHO.toString(), `${totalDispatches > 0 ? ((dispatchesByType.DESPACHO / totalDispatches) * 100).toFixed(1) : 0}%`]
    ];

    autoTable(doc, {
      head: [typeData[0]],
      body: typeData.slice(1),
      startY: yPosition,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 5
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255]
      }
    });

    yPosition = (doc as any).lastAutoTable?.finalY + 20 || yPosition + 20;

    // Distribución por estado
    doc.setFontSize(16);
    doc.text('Distribución por Estado', 20, yPosition);
    yPosition += 15;

    const statusData = [
      ['Estado', 'Cantidad', 'Porcentaje'],
      ['Pendiente', dispatchesByStatus.PENDING.toString(), `${totalDispatches > 0 ? ((dispatchesByStatus.PENDING / totalDispatches) * 100).toFixed(1) : 0}%`],
      ['Programado', dispatchesByStatus.SCHEDULED.toString(), `${totalDispatches > 0 ? ((dispatchesByStatus.SCHEDULED / totalDispatches) * 100).toFixed(1) : 0}%`],
      ['En Tránsito', dispatchesByStatus.IN_TRANSIT.toString(), `${totalDispatches > 0 ? ((dispatchesByStatus.IN_TRANSIT / totalDispatches) * 100).toFixed(1) : 0}%`],
      ['Entregado', dispatchesByStatus.DELIVERED.toString(), `${totalDispatches > 0 ? ((dispatchesByStatus.DELIVERED / totalDispatches) * 100).toFixed(1) : 0}%`],
      ['Cancelado', dispatchesByStatus.CANCELLED.toString(), `${totalDispatches > 0 ? ((dispatchesByStatus.CANCELLED / totalDispatches) * 100).toFixed(1) : 0}%`]
    ];

    autoTable(doc, {
      head: [statusData[0]],
      body: statusData.slice(1),
      startY: yPosition,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 5
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255]
      }
    });

    // Nueva página para el detalle de despachos con información financiera
    if (dispatches.length > 0) {
      doc.addPage();
      
      doc.setFontSize(16);
      doc.text('Detalle de Despachos con Información Financiera', 20, 20);

      // Preparar datos para la tabla de detalles
      const detailHeaders = ['Fecha', 'Tipo', 'Sucursal', 'Vendedor', 'Cliente', 'Doc.', 'Monto Neto', 'Estado'];
      const detailRows = dispatches.slice(0, 100).map((dispatch: any) => {
        let montoNetoSinDespacho = 0;
        if (dispatch.documentInfo) {
          try {
            const info = JSON.parse(dispatch.documentInfo);
            const montoTotal = parseFloat(info.MntTotal || '0');
            const fleteTransporte = parseFloat(info.transporte || info.flete || '0');
            // Calcular monto neto sin despacho: Monto Total - (Flete/Transporte sin IVA)
            const fleteNetoSinIVA = fleteTransporte / 1.19; // Quitar el 19% de IVA
            montoNetoSinDespacho = montoTotal - fleteNetoSinIVA;
          } catch (e) {
            console.error('Error parsing documentInfo:', e);
          }
        }

        return [
          new Date(dispatch.createdAt).toLocaleDateString('es-CL'),
          dispatch.tipoDespacho === 'RETIRO_LOCAL' ? 'Retiro' : 
          dispatch.tipoDespacho === 'COURIER' ? 'Courier' : 'Despacho',
          (dispatch.branch?.nombre || 'Sin sucursal').substring(0, 12),
          dispatch.vendorCode,
          dispatch.clienteNombre.substring(0, 18),
          dispatch.documentNumber,
          `$${montoNetoSinDespacho.toLocaleString('es-CL')}`,
          dispatch.status === 'PENDING' ? 'Pend.' :
          dispatch.status === 'SCHEDULED' ? 'Prog.' :
          dispatch.status === 'IN_TRANSIT' ? 'Tráns.' :
          dispatch.status === 'DELIVERED' ? 'Entr.' : 'Canc.'
        ];
      });

      autoTable(doc, {
        head: [detailHeaders],
        body: detailRows,
        startY: 30,
        theme: 'striped',
        styles: {
          fontSize: 7,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: [255, 255, 255],
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 20 }, // Fecha
          1: { cellWidth: 18 }, // Tipo
          2: { cellWidth: 25 }, // Sucursal
          3: { cellWidth: 18 }, // Vendedor
          4: { cellWidth: 32 }, // Cliente
          5: { cellWidth: 20 }, // Documento
          6: { cellWidth: 25, halign: 'right' }, // Monto
          7: { cellWidth: 15 }  // Estado
        }
      });

      if (dispatches.length > 100) {
        const currentY = (doc as any).lastAutoTable?.finalY + 10 || 100;
        doc.setFontSize(10);
        doc.text(`Mostrando 100 de ${dispatches.length} despachos`, 20, currentY);
      }
    }

    // Pie de página
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${pageCount}`, 20, 290);
      doc.text('Sistema de Gestión de Despachos - Siding Pro Limitada', 120, 290);
    }

    // Generar buffer del PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte-despachos-${startDate}-${endDate}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error al generar PDF:', error);
    return NextResponse.json(
      { error: 'Error al generar el reporte PDF' },
      { status: 500 }
    );
  }
}