
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Interface para la respuesta de consolidación
interface PaymentConsolidation {
  totalsByMethod: {
    efectivo: number;
    transferencia: number;
    webpay: number;
    total: number;
  };
  documentDetails: DocumentPaymentStatus[];
  summary: {
    totalDocuments: number;
    documentsWithPayment: number;
    documentsWithoutPayment: number;
    verificationPercentage: number;
  };
}

interface DocumentPaymentStatus {
  documentNumber: string;
  documentType: string;
  documentDate: string;
  clientName: string;
  amount: number;
  vendorCode: string;
  hasPaymentVerification: boolean;
  paymentMethod?: string;
  paymentVerificationDate?: Date;
  paymentComment?: string;
  photoUrl?: string;
  status: 'verified' | 'missing' | 'pending';
  // Campos específicos para cierre de caja
  targetDocumentType?: string; // 'Factura' | 'Boleta'
  readyForInvoicing?: boolean;
  documentTypeLabel?: string; // 'Cotización' | 'Nota de Venta'
  processStatus?: string; // Estado del proceso (A=Aprobado)
}

// GET - Obtener consolidación de pagos
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    
    // Solo administradores pueden acceder a la consolidación
    if (user.perfil !== 'administrador') {
      return NextResponse.json(
        { success: false, error: 'Solo administradores pueden acceder a la consolidación de pagos' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const ci_session = searchParams.get('ci_session');

    // Validar sesión ERP
    if (!ci_session) {
      return NextResponse.json(
        { success: false, error: 'Sesión ERP requerida para obtener documentos' },
        { status: 400 }
      );
    }

    // Configurar rango de fechas (por defecto último mes)
    let startDate: Date;
    let endDate: Date;

    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999); // Incluir todo el día final
    } else {
      // Por defecto, último mes
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
    }

    console.log('[PAYMENT CONSOLIDATION] Rango de fechas:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // 1. Obtener todas las verificaciones de pago en el rango de fechas
    const paymentVerifications = await prisma.paymentVerification.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            nombre: true,
            codigo_vendedor: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('[PAYMENT CONSOLIDATION] Verificaciones encontradas:', paymentVerifications.length);

    // 2. Obtener documentos ERP con referencias tipo 33 o 39 (facturas/boletas)
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };
    
    const dateRange = `${formatDate(startDate)} a ${formatDate(endDate)}`;

    // Preparar filtros específicos para cierre de caja diario
    // Buscar documentos CT (Cotización) y NV (Nota de Venta) aprobados
    const erpFilters = {
      FchDoc: dateRange,
      EstadoProcesoDoc: "A", // Solo documentos aprobados
      TipoDoc: "CT", // Inicialmente CT (Cotización)
      limit: 2000,
    };

    console.log('[PAYMENT CONSOLIDATION] Filtros para cierre de caja:', erpFilters);

    // Obtener documentos CT aprobados
    const erpResponseCT = await fetch(`${request.url.split('/api')[0]}/api/erp/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `ci_session=${ci_session}`,
      },
      body: JSON.stringify({
        ci_session,
        filters: erpFilters,
      }),
    });

    // Obtener documentos NV aprobados
    const erpFiltersNV = { ...erpFilters, TipoDoc: "NV" };
    const erpResponseNV = await fetch(`${request.url.split('/api')[0]}/api/erp/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `ci_session=${ci_session}`,
      },
      body: JSON.stringify({
        ci_session,
        filters: erpFiltersNV,
      }),
    });

    // Verificar respuestas
    if (!erpResponseCT.ok || !erpResponseNV.ok) {
      console.error('[PAYMENT CONSOLIDATION] Error obteniendo documentos ERP:', {
        CT: erpResponseCT.status,
        NV: erpResponseNV.status
      });
      return NextResponse.json(
        { success: false, error: 'Error obteniendo documentos del ERP para cierre de caja' },
        { status: 500 }
      );
    }

    const erpDataCT = await erpResponseCT.json();
    const erpDataNV = await erpResponseNV.json();
    
    if ((!erpDataCT.success || !erpDataCT.documents) || (!erpDataNV.success || !erpDataNV.documents)) {
      console.error('[PAYMENT CONSOLIDATION] Respuesta ERP inválida:', { 
        CT: erpDataCT.success, 
        NV: erpDataNV.success 
      });
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener documentos del ERP para cierre de caja' },
        { status: 500 }
      );
    }

    // Combinar documentos CT y NV
    const erpDocuments = [...(erpDataCT.documents || []), ...(erpDataNV.documents || [])];
    console.log('[PAYMENT CONSOLIDATION] Documentos ERP obtenidos (CT+NV):', erpDocuments.length);

    // 3. Filtrar documentos de cierre de caja: CT/NV aprobados con desglose 33 o 39
    const documentsRequiringPayment = erpDocuments.filter((doc: any) => {
      // Verificar que sea documento CT o NV aprobado
      const isCTorNV = doc.TipoDoc === 'CT' || doc.TipoDoc === 'NV';
      const isApproved = doc.EstadoProcesoDoc === 'A';
      
      if (!isCTorNV || !isApproved) {
        return false;
      }
      
      // Verificar si el documento tiene desglose con codtipodoc 33 o 39 (facturas/boletas)
      if (!doc.Desglose) {
        console.log('[PAYMENT CONSOLIDATION] Documento sin desglose:', doc.NumDoc);
        return false;
      }
      
      try {
        const desglose = typeof doc.Desglose === 'string' ? JSON.parse(doc.Desglose) : doc.Desglose;
        
        // Buscar referencias tipo 33 (factura) o 39 (boleta) en el desglose
        const hasRequiredReference = Array.isArray(desglose) && desglose.some((ref: any) => {
          const codtipodoc = ref.codtipodoc || ref.CodTipoDoc || ref.tipo || ref.TipoDoc || ref.type;
          const isValidType = codtipodoc === '33' || codtipodoc === '39' || codtipodoc === 33 || codtipodoc === 39;
          
          if (isValidType) {
            console.log('[PAYMENT CONSOLIDATION] Documento válido para cierre:', doc.NumDoc, 'codtipodoc:', codtipodoc);
          }
          
          return isValidType;
        });

        return hasRequiredReference;
      } catch (error) {
        console.log('[PAYMENT CONSOLIDATION] Error parseando Desglose:', doc.NumDoc, error);
        return false;
      }
    });

    console.log('[PAYMENT CONSOLIDATION] Documentos válidos para cierre de caja:', documentsRequiringPayment.length);

    // 4. Crear mapa de verificaciones por documento
    const verificationMap = new Map();
    paymentVerifications.forEach(verification => {
      const key = `${verification.documentNumber}-${verification.documentType}`;
      verificationMap.set(key, verification);
    });

    // 5. Calcular totales por método de pago
    const totalsByMethod = {
      efectivo: 0,
      transferencia: 0,
      webpay: 0,
      total: 0,
    };

    paymentVerifications.forEach(verification => {
      // Intentar convertir el monto del documento info
      let amount = 0;
      try {
        const docInfo = JSON.parse(verification.documentInfo || '{}');
        amount = parseFloat(docInfo.MntTotal || docInfo.amount || '0') || 0;
      } catch (error) {
        console.log('[PAYMENT CONSOLIDATION] Error parseando documentInfo:', verification.id);
      }

      totalsByMethod[verification.paymentMethod as keyof typeof totalsByMethod] += amount;
      totalsByMethod.total += amount;
    });

    // 6. Procesar detalles de documentos para cierre de caja
    const documentDetails: DocumentPaymentStatus[] = documentsRequiringPayment.map((doc: any) => {
      const key = `${doc.NumDoc}-${doc.TipoDoc}`;
      const verification = verificationMap.get(key);
      const amount = parseFloat(doc.MntTotal || doc.MntNeto || '0') || 0;

      // Extraer información del desglose para mostrar qué tipo de factura/boleta generará
      let targetDocumentType = '';
      try {
        const desglose = typeof doc.Desglose === 'string' ? JSON.parse(doc.Desglose) : doc.Desglose;
        const targetRef = Array.isArray(desglose) && desglose.find((ref: any) => {
          const codtipodoc = ref.codtipodoc || ref.CodTipoDoc || ref.tipo || ref.TipoDoc || ref.type;
          return codtipodoc === '33' || codtipodoc === '39' || codtipodoc === 33 || codtipodoc === 39;
        });
        
        if (targetRef) {
          const codtipodoc = targetRef.codtipodoc || targetRef.CodTipoDoc || targetRef.tipo || targetRef.TipoDoc || targetRef.type;
          targetDocumentType = codtipodoc === '33' || codtipodoc === 33 ? 'Factura' : 'Boleta';
        }
      } catch (error) {
        console.log('[PAYMENT CONSOLIDATION] Error procesando desglose para UI:', doc.NumDoc);
      }

      return {
        documentNumber: doc.NumDoc || '',
        documentType: doc.TipoDoc || '',
        documentDate: doc.FchDoc || '',
        clientName: doc.NomCliente || '',
        amount: amount,
        vendorCode: doc.Vendedor || doc.CodVend || '',
        hasPaymentVerification: !!verification,
        paymentMethod: verification?.paymentMethod,
        paymentVerificationDate: verification?.createdAt,
        paymentComment: verification?.comment,
        photoUrl: verification?.photoUrl,
        status: verification ? 'verified' : 'missing',
        // Información específica para cierre de caja
        targetDocumentType: targetDocumentType,
        readyForInvoicing: !!verification, // Solo se puede facturar si el pago está verificado
        documentTypeLabel: doc.TipoDoc === 'CT' ? 'Cotización' : 'Nota de Venta',
        processStatus: doc.EstadoProcesoDoc || '',
      };
    });

    // 7. Calcular resumen
    const summary = {
      totalDocuments: documentDetails.length,
      documentsWithPayment: documentDetails.filter(d => d.hasPaymentVerification).length,
      documentsWithoutPayment: documentDetails.filter(d => !d.hasPaymentVerification).length,
      verificationPercentage: documentDetails.length > 0 
        ? Math.round((documentDetails.filter(d => d.hasPaymentVerification).length / documentDetails.length) * 100)
        : 0,
    };

    console.log('[PAYMENT CONSOLIDATION] Resumen:', summary);

    const consolidation: PaymentConsolidation = {
      totalsByMethod,
      documentDetails: documentDetails.sort((a, b) => 
        new Date(b.documentDate).getTime() - new Date(a.documentDate).getTime()
      ),
      summary,
    };

    return NextResponse.json({
      success: true,
      consolidation,
      dateRange: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
    });

  } catch (error) {
    console.error('[PAYMENT CONSOLIDATION] Error en consolidación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
