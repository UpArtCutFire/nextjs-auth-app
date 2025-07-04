
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Interface para documentos que requieren verificación de pago
interface PaymentVerificationDocument {
  NumDoc: string;
  TipoDoc: string;
  FchDoc: string;
  NomCliente: string;
  MntTotal: string;
  MntNeto: string;
  CodVend: string;
  Vendedor: string;
  EstadoProcesoDoc: string;
  Desglose: string | any[];
  targetDocumentType: string; // 'Factura' | 'Boleta'
  hasPaymentVerification: boolean;
  paymentVerificationDate?: Date;
  paymentComment?: string;
  photoUrl?: string;
}

// Interface para filtros dinámicos
interface PaymentVerificationFilters {
  FchDoc?: string;
  NumDoc?: string;
  NomCliente?: string;
  CodCli?: string;
  CodVend?: string;
  MntTotalMin?: string;
  MntTotalMax?: string;
}

// GET - Obtener documentos que requieren verificación de pago para cierre de caja
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    
    // Solo administradores pueden acceder a la verificación de pagos
    if (user.perfil !== 'administrador') {
      return NextResponse.json(
        { success: false, error: 'Solo administradores pueden acceder a la verificación de pagos' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ci_session = searchParams.get('ci_session');

    // Validar sesión ERP
    if (!ci_session) {
      return NextResponse.json(
        { success: false, error: 'Sesión ERP requerida para obtener documentos' },
        { status: 400 }
      );
    }

    // Obtener filtros dinámicos de los query parameters
    const filters: PaymentVerificationFilters = {
      FchDoc: searchParams.get('FchDoc') || undefined,
      NumDoc: searchParams.get('NumDoc') || undefined,
      NomCliente: searchParams.get('NomCliente') || undefined,
      CodCli: searchParams.get('CodCli') || undefined,
      CodVend: searchParams.get('CodVend') || undefined,
      MntTotalMin: searchParams.get('MntTotalMin') || undefined,
      MntTotalMax: searchParams.get('MntTotalMax') || undefined,
    };

    // Configurar rango de fechas por defecto (mes actual)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };
    
    const defaultDateRange = `${formatDate(startOfMonth)} a ${formatDate(endOfMonth)}`;

    console.log('[PAYMENT VERIFICATION] Iniciando verificación de pagos para cierre de caja');
    console.log('[PAYMENT VERIFICATION] Filtros recibidos:', filters);

    // Body base exacto según especificaciones del usuario
    const baseParams = {
      query: "",
      limit: 1000,
      ascending: 0,
      page: "1",
      byColumn: 0,
      orderBy: "NumDoc",
      NumDoc: "",
      NomCliente: "",
      CodCli: "",
      NomContacto: "",
      GlosaDoc: "",
      notificada: "",
      rutCli: "",
      cc: "",
      MntNeto: "",
      MntTotal: "",
      MntTotalMin: "",
      MntTotalMax: "",
      TipoMoneda: "",
      CodVend: "",
      AfectaCT: "",
      EstadoProcesoDoc: "A", // Solo documentos aprobados
      FchDoc: filters.FchDoc || defaultDateRange,
      TipoDoc: "CT", // Se cambiará para cada llamada
      acno: "",
      losprimeros: ""
    };

    // Aplicar filtros dinámicos al body base
    if (filters.NumDoc) baseParams.NumDoc = filters.NumDoc;
    if (filters.NomCliente) baseParams.NomCliente = filters.NomCliente;
    if (filters.CodCli) baseParams.CodCli = filters.CodCli;
    if (filters.CodVend) baseParams.CodVend = filters.CodVend;
    if (filters.MntTotalMin) baseParams.MntTotalMin = filters.MntTotalMin;
    if (filters.MntTotalMax) baseParams.MntTotalMax = filters.MntTotalMax;

    console.log('[PAYMENT VERIFICATION] Params base aplicados:', baseParams);

    // Array para almacenar todos los documentos válidos
    let allValidDocuments: any[] = [];

    // Función para realizar petición al ERP con body específico
    const fetchERPDocuments = async (tipoDoc: string) => {
      const params = { ...baseParams, TipoDoc: tipoDoc };
      const requestBody = { params };

      console.log(`[PAYMENT VERIFICATION] Obteniendo documentos ${tipoDoc}:`, requestBody);

      const response = await fetch('https://clientes.erpyme.cl/Documentos/get_listado_documentos', {
        method: 'POST',
        headers: {
          'Cookie': `ci_session=${ci_session}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        console.error(`[PAYMENT VERIFICATION] Error obteniendo documentos ${tipoDoc}:`, response.status);
        throw new Error(`Error del ERP para documentos ${tipoDoc}: ${response.status}`);
      }

      const erpData = await response.json();
      
      if (!erpData || !erpData.data) {
        console.log(`[PAYMENT VERIFICATION] Sin datos para documentos ${tipoDoc}`);
        return [];
      }

      // Convertir a array si es necesario
      let documents = Array.isArray(erpData.data) ? erpData.data : Object.values(erpData.data);
      console.log(`[PAYMENT VERIFICATION] Documentos ${tipoDoc} obtenidos:`, documents.length);

      return documents;
    };

    try {
      // Obtener documentos CT (Cotización) aprobados
      const documentsCT = await fetchERPDocuments('CT');
      allValidDocuments.push(...documentsCT);

      // Obtener documentos NV (Nota de Venta) aprobados
      const documentsNV = await fetchERPDocuments('NV');
      allValidDocuments.push(...documentsNV);

      console.log('[PAYMENT VERIFICATION] Total documentos CT+NV obtenidos:', allValidDocuments.length);

    } catch (error) {
      console.error('[PAYMENT VERIFICATION] Error obteniendo documentos ERP:', error);
      return NextResponse.json(
        { success: false, error: 'Error obteniendo documentos del ERP' },
        { status: 500 }
      );
    }

    // Filtrar documentos que requieren verificación de pago:
    // 1. Solo documentos CT/NV aprobados (EstadoProcesoDoc: "A")
    // 2. Con desglose que contenga codtipodoc 33 o 39
    const documentsRequiringPayment = allValidDocuments.filter((doc: any) => {
      // Verificar que sea documento CT o NV aprobado
      const isCTorNV = doc.TipoDoc === 'CT' || doc.TipoDoc === 'NV';
      const isApproved = doc.EstadoProcesoDoc === 'A';
      
      if (!isCTorNV || !isApproved) {
        return false;
      }
      
      // Verificar si el documento tiene desglose con codtipodoc 33 o 39
      if (!doc.Desglose) {
        return false;
      }
      
      try {
        const desglose = typeof doc.Desglose === 'string' ? JSON.parse(doc.Desglose) : doc.Desglose;
        
        // Buscar referencias tipo 33 (factura) o 39 (boleta) en el desglose
        const hasRequiredReference = Array.isArray(desglose) && desglose.some((ref: any) => {
          const codtipodoc = ref.codtipodoc || ref.CodTipoDoc || ref.tipo || ref.TipoDoc || ref.type;
          const isValidType = codtipodoc === '33' || codtipodoc === '39' || codtipodoc === 33 || codtipodoc === 39;
          
          if (isValidType) {
            console.log('[PAYMENT VERIFICATION] Documento válido:', doc.NumDoc, 'tipo:', doc.TipoDoc, 'codtipodoc:', codtipodoc);
          }
          
          return isValidType;
        });

        return hasRequiredReference;
      } catch (error) {
        console.log('[PAYMENT VERIFICATION] Error parseando Desglose:', doc.NumDoc, error);
        return false;
      }
    });

    console.log('[PAYMENT VERIFICATION] Documentos válidos para verificación:', documentsRequiringPayment.length);

    // Obtener verificaciones de pago existentes
    const paymentVerifications = await prisma.paymentVerification.findMany({
      where: {
        documentNumber: {
          in: documentsRequiringPayment.map((doc: any) => doc.NumDoc)
        }
      }
    });

    console.log('[PAYMENT VERIFICATION] Verificaciones existentes:', paymentVerifications.length);

    // Crear mapa de verificaciones por documento
    const verificationMap = new Map();
    paymentVerifications.forEach(verification => {
      const key = `${verification.documentNumber}-${verification.documentType}`;
      verificationMap.set(key, verification);
    });

    // Procesar documentos con información de verificación y tipo de documento destino
    const processedDocuments: PaymentVerificationDocument[] = documentsRequiringPayment.map((doc: any) => {
      const key = `${doc.NumDoc}-${doc.TipoDoc}`;
      const verification = verificationMap.get(key);

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
        console.log('[PAYMENT VERIFICATION] Error procesando desglose:', doc.NumDoc);
        targetDocumentType = 'Factura/Boleta';
      }

      return {
        NumDoc: doc.NumDoc || '',
        TipoDoc: doc.TipoDoc || '',
        FchDoc: doc.FchDoc || '',
        NomCliente: doc.NomCliente || '',
        MntTotal: doc.MntTotal || '0',
        MntNeto: doc.MntNeto || '0',
        CodVend: doc.CodVend || doc.Vendedor || '',
        Vendedor: doc.Vendedor || doc.CodVend || '',
        EstadoProcesoDoc: doc.EstadoProcesoDoc || '',
        Desglose: doc.Desglose,
        targetDocumentType: targetDocumentType,
        hasPaymentVerification: !!verification,
        paymentVerificationDate: verification?.createdAt,
        paymentComment: verification?.comment,
        photoUrl: verification?.photoUrl,
      };
    });

    // Calcular estadísticas
    const statistics = {
      totalDocuments: processedDocuments.length,
      documentsWithPayment: processedDocuments.filter(d => d.hasPaymentVerification).length,
      documentsWithoutPayment: processedDocuments.filter(d => !d.hasPaymentVerification).length,
      verificationPercentage: processedDocuments.length > 0 
        ? Math.round((processedDocuments.filter(d => d.hasPaymentVerification).length / processedDocuments.length) * 100)
        : 0,
      readyForInvoicing: processedDocuments.filter(d => d.hasPaymentVerification).length,
      pendingVerification: processedDocuments.filter(d => !d.hasPaymentVerification).length,
    };

    console.log('[PAYMENT VERIFICATION] Estadísticas finales:', statistics);

    return NextResponse.json({
      success: true,
      documents: processedDocuments.sort((a, b) => new Date(b.FchDoc).getTime() - new Date(a.FchDoc).getTime()),
      statistics,
      dateRange: {
        from: filters.FchDoc || defaultDateRange,
        appliedFilters: filters,
      },
    });

  } catch (error) {
    console.error('[PAYMENT VERIFICATION] Error general:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
