import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';

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

    // ==================== HOJA 1: RESUMEN EJECUTIVO ====================
    const summaryData = [
      ['REPORTE DE DESPACHOS'],
      [],
      ['Período:', `${start.toLocaleDateString('es-CL')} - ${end.toLocaleDateString('es-CL')}`],
      ['Generado:', `${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}`],
      [],
      ['RESUMEN EJECUTIVO'],
      ['Total de Despachos:', totalDispatches],
      ['Entregas Completadas:', dispatchesByStatus.DELIVERED],
      ['Tasa de Completitud:', `${totalDispatches > 0 ? ((dispatchesByStatus.DELIVERED / totalDispatches) * 100).toFixed(1) : 0}%`],
      [],
      ['DISTRIBUCIÓN POR TIPO DE DESPACHO'],
      ['Tipo', 'Cantidad', 'Porcentaje'],
      ['Retiro Local', dispatchesByType.RETIRO_LOCAL, `${totalDispatches > 0 ? ((dispatchesByType.RETIRO_LOCAL / totalDispatches) * 100).toFixed(1) : 0}%`],
      ['Courier', dispatchesByType.COURIER, `${totalDispatches > 0 ? ((dispatchesByType.COURIER / totalDispatches) * 100).toFixed(1) : 0}%`],
      ['Despacho', dispatchesByType.DESPACHO, `${totalDispatches > 0 ? ((dispatchesByType.DESPACHO / totalDispatches) * 100).toFixed(1) : 0}%`],
      [],
      ['DISTRIBUCIÓN POR ESTADO'],
      ['Estado', 'Cantidad', 'Porcentaje'],
      ['Pendiente', dispatchesByStatus.PENDING, `${totalDispatches > 0 ? ((dispatchesByStatus.PENDING / totalDispatches) * 100).toFixed(1) : 0}%`],
      ['Programado', dispatchesByStatus.SCHEDULED, `${totalDispatches > 0 ? ((dispatchesByStatus.SCHEDULED / totalDispatches) * 100).toFixed(1) : 0}%`],
      ['En Tránsito', dispatchesByStatus.IN_TRANSIT, `${totalDispatches > 0 ? ((dispatchesByStatus.IN_TRANSIT / totalDispatches) * 100).toFixed(1) : 0}%`],
      ['Entregado', dispatchesByStatus.DELIVERED, `${totalDispatches > 0 ? ((dispatchesByStatus.DELIVERED / totalDispatches) * 100).toFixed(1) : 0}%`],
      ['Cancelado', dispatchesByStatus.CANCELLED, `${totalDispatches > 0 ? ((dispatchesByStatus.CANCELLED / totalDispatches) * 100).toFixed(1) : 0}%`]
    ];

    // ==================== HOJA 2: DETALLE DE DESPACHOS ====================
    const detailHeaders = [
      'Fecha Creación',
      'Tipo Entrega',
      'Sucursal',
      'Código Vendedor',
      'Nombre Vendedor',
      'Cliente',
      'Número Documento',
      'Tipo Documento',
      'Monto Total',
      'Flete/Transporte',
      'Flete Neto (sin IVA)',
      'Monto Neto sin Despacho',
      'Estado',
      'Tamaño Despacho',
      'Transporte (Patente)',
      'Transporte (Nombre)',
      'Transporte (Talla)',
      'Fecha Programada',
      'Horario',
      'Fecha Iniciado',
      'Fecha Completado',
      'Dirección',
      'Comuna',
      'Región',
      'Teléfono',
      'Correo'
    ];

    const detailRows = dispatches.map((dispatch: any) => {
      let montoTotal = 0;
      let fleteTransporte = 0;
      let fleteNetoSinIVA = 0;
      let montoNetoSinDespacho = 0;

      if (dispatch.documentInfo) {
        try {
          const info = JSON.parse(dispatch.documentInfo);
          montoTotal = parseFloat(info.MntTotal || '0');
          fleteTransporte = parseFloat(info.transporte || info.flete || '0');
          // Calcular flete neto (sin IVA)
          fleteNetoSinIVA = fleteTransporte / 1.19;
          // Calcular monto neto sin despacho
          montoNetoSinDespacho = montoTotal - fleteNetoSinIVA;
        } catch (e) {
          console.error('Error parsing documentInfo:', e);
        }
      }

      const statusLabels: Record<string, string> = {
        'PENDING': 'Pendiente',
        'SCHEDULED': 'Programado',
        'IN_TRANSIT': 'En Tránsito',
        'DELIVERED': 'Entregado',
        'CANCELLED': 'Cancelado'
      };

      const typeLabels: Record<string, string> = {
        'RETIRO_LOCAL': 'Retiro Local',
        'COURIER': 'Courier',
        'DESPACHO': 'Despacho'
      };

      return [
        new Date(dispatch.createdAt).toLocaleDateString('es-CL') + ' ' + new Date(dispatch.createdAt).toLocaleTimeString('es-CL'),
        typeLabels[dispatch.tipoDespacho] || dispatch.tipoDespacho,
        dispatch.branch?.nombre || 'Sin sucursal',
        dispatch.vendorCode,
        dispatch.user?.nombre || '',
        dispatch.clienteNombre,
        dispatch.documentNumber,
        dispatch.documentType,
        montoTotal,
        fleteTransporte,
        fleteNetoSinIVA,
        montoNetoSinDespacho,
        statusLabels[dispatch.status] || dispatch.status,
        dispatch.tamanoDespacho,
        dispatch.transport?.patente || 'Sin asignar',
        dispatch.transport?.nombre || 'Sin asignar',
        dispatch.transport?.talla || '',
        dispatch.scheduledDate ? new Date(dispatch.scheduledDate).toLocaleDateString('es-CL') : '',
        dispatch.scheduledPeriod || '',
        dispatch.startedAt ? new Date(dispatch.startedAt).toLocaleDateString('es-CL') + ' ' + new Date(dispatch.startedAt).toLocaleTimeString('es-CL') : '',
        dispatch.completedAt ? new Date(dispatch.completedAt).toLocaleDateString('es-CL') + ' ' + new Date(dispatch.completedAt).toLocaleTimeString('es-CL') : '',
        dispatch.direccion || '',
        dispatch.comuna || '',
        dispatch.region || '',
        dispatch.telefono || '',
        dispatch.correo || ''
      ];
    });

    // Crear libro de trabajo (workbook)
    const workbook = XLSX.utils.book_new();

    // Crear hoja de resumen
    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);

    // Configurar anchos de columna para la hoja de resumen
    summaryWorksheet['!cols'] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 15 }
    ];

    // Crear hoja de detalle
    const detailWorksheet = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);

    // Configurar anchos de columna para la hoja de detalle
    detailWorksheet['!cols'] = [
      { wch: 20 },  // Fecha Creación
      { wch: 15 },  // Tipo Entrega
      { wch: 20 },  // Sucursal
      { wch: 15 },  // Código Vendedor
      { wch: 25 },  // Nombre Vendedor
      { wch: 30 },  // Cliente
      { wch: 15 },  // Número Documento
      { wch: 12 },  // Tipo Documento
      { wch: 15 },  // Monto Total
      { wch: 15 },  // Flete/Transporte
      { wch: 18 },  // Flete Neto
      { wch: 20 },  // Monto Neto sin Despacho
      { wch: 12 },  // Estado
      { wch: 12 },  // Tamaño Despacho
      { wch: 18 },  // Transporte Patente
      { wch: 20 },  // Transporte Nombre
      { wch: 10 },  // Transporte Talla
      { wch: 15 },  // Fecha Programada
      { wch: 10 },  // Horario
      { wch: 20 },  // Fecha Iniciado
      { wch: 20 },  // Fecha Completado
      { wch: 35 },  // Dirección
      { wch: 15 },  // Comuna
      { wch: 20 },  // Región
      { wch: 15 },  // Teléfono
      { wch: 25 }   // Correo
    ];

    // Agregar hojas al libro
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Resumen');
    XLSX.utils.book_append_sheet(workbook, detailWorksheet, 'Detalle de Despachos');

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="reporte-despachos-${startDate}-${endDate}.xlsx"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error al generar Excel:', error);
    return NextResponse.json(
      { error: 'Error al generar el reporte Excel' },
      { status: 500 }
    );
  }
}
