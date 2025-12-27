export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { getERPCredentials } from '@/lib/erp-config';
import {
  VendorMetrics,
  VendorInfo,
  ERPDocument,
  MonthlyComparisonData,
  CommissionHistoryData,
  BestMonthData
} from '@/lib/types';

const prisma = new PrismaClient();

// Nombres de meses en español
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Función para obtener el rango de fechas de un mes específico
function getMonthDateRange(year: number, month: number): { start: string; end: string } {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  return {
    start: formatDate(startDate),
    end: formatDate(endDate)
  };
}

// Función para autenticar con ERP
async function authenticateERP(): Promise<string | null> {
  try {
    const credentials = await getERPCredentials();

    // Paso 1: Login al ERP
    const authResponse = await fetch('https://clientes.erpyme.cl/login/login2post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: new URLSearchParams({
        'data[txtrutempresa]': credentials.txtrutempresa,
        'data[txtusuario]': credentials.txtusuario,
        'data[txtpwd]': credentials.txtpwd,
      }).toString(),
      redirect: 'manual',
    });

    const authData = await authResponse.json();

    if (authData.estado !== 'OK' || !authData.url) {
      console.error('[VENDOR METRICS] Error autenticación ERP:', authData);
      return null;
    }

    // Paso 2: Obtener sesión
    const sessionResponse = await fetch(authData.url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'manual',
    });

    const setCookieHeaders = sessionResponse.headers.getSetCookie?.() || [];
    let ci_session: string | null = null;

    for (const cookieHeader of setCookieHeaders) {
      if (cookieHeader.includes('ci_session=')) {
        const match = cookieHeader.match(/ci_session=([^;]+)/);
        if (match) {
          ci_session = match[1];
          break;
        }
      }
    }

    return ci_session;
  } catch (error) {
    console.error('[VENDOR METRICS] Error en autenticación ERP:', error);
    return null;
  }
}

// Función para obtener documentos del ERP
async function fetchERPDocuments(
  ciSession: string,
  vendorCode: string,
  dateRange: { start: string; end: string },
  tipoDoc: string = ''
): Promise<ERPDocument[]> {
  try {
    const response = await fetch('https://clientes.erpyme.cl/Documentos/get_listado_documentos', {
      method: 'POST',
      headers: {
        'Cookie': `ci_session=${ciSession}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        params: {
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
          CodVend: vendorCode,
          AfectaCT: "",
          EstadoProcesoDoc: "",
          FchDoc: `${dateRange.start} a ${dateRange.end}`,
          TipoDoc: tipoDoc,
          acno: "",
          losprimeros: ""
        }
      })
    });

    if (!response.ok) {
      console.error('[VENDOR METRICS] Error fetch ERP:', response.status);
      return [];
    }

    const data = await response.json();
    let documents: ERPDocument[] = [];

    if (data && Array.isArray(data.data)) {
      documents = data.data;
    } else if (data && data.data && typeof data.data === 'object') {
      documents = Object.values(data.data);
    }

    // Filtrar solo CT y NV
    if (tipoDoc === '') {
      documents = documents.filter(doc =>
        doc.TipoDoc === 'CT' || doc.TipoDoc === 'NV'
      );
    }

    // Filtrar por código de vendedor
    documents = documents.filter(doc =>
      doc.CodVend === vendorCode || doc.Vendedor === vendorCode
    );

    return documents;
  } catch (error) {
    console.error('[VENDOR METRICS] Error obteniendo documentos:', error);
    return [];
  }
}

// Función para calcular comisión de un documento
function calculateCommission(
  document: ERPDocument,
  porcentajeComision: number,
  comisionBase: number,
  fleteNeto: number = 0
): number {
  const montoNeto = parseFloat(String(document.MntNeto || 0));
  const baseComision = montoNeto - fleteNeto;
  return baseComision * (porcentajeComision / 100);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener usuario de la BD
    const user = await prisma.user.findUnique({
      where: { correo: session.user?.email ?? '' }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (!user.codigo_vendedor) {
      return NextResponse.json({
        error: 'Usuario sin código de vendedor asignado'
      }, { status: 400 });
    }

    // Obtener mes seleccionado del body
    const body = await request.json().catch(() => ({}));
    const selectedMonth = body.month || new Date().toISOString().slice(0, 7); // "2025-12"

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // 0-indexed

    console.log('[VENDOR METRICS] ========================================');
    console.log('[VENDOR METRICS] Procesando métricas para:', {
      vendedor: user.codigo_vendedor,
      nombre: user.nombre,
      mes: selectedMonth,
      porcentajeComision: user.porcentaje_comision,
      comisionBase: user.comision_base
    });

    // Autenticar con ERP
    const ciSession = await authenticateERP();

    if (!ciSession) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo conectar con el ERP'
      }, { status: 503 });
    }

    // Obtener documentos del mes seleccionado
    const dateRange = getMonthDateRange(year, month);
    const documents = await fetchERPDocuments(ciSession, user.codigo_vendedor, dateRange);

    console.log('[VENDOR METRICS] Documentos encontrados:', documents.length);
    if (documents.length > 0) {
      const totalNeto = documents.reduce((sum, doc) => sum + parseFloat(String(doc.MntNeto || 0)), 0);
      console.log('[VENDOR METRICS] Total MntNeto de documentos:', totalNeto);
    }

    // Obtener verificaciones de pago del mes
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const verifications = await prisma.paymentVerification.findMany({
      where: {
        vendorCode: user.codigo_vendedor,
        status: 'APPROVED',
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Crear set de documentos verificados
    const verifiedDocNumbers = new Set(
      verifications.map(v => `${v.documentType}-${v.documentNumber}`)
    );

    // Calcular métricas del mes actual
    const totalDocuments = documents.length;
    const verifiedDocuments = documents.filter(doc =>
      verifiedDocNumbers.has(`${doc.TipoDoc}-${doc.NumDoc}`)
    ).length;
    const pendingDocuments = totalDocuments - verifiedDocuments;
    const progressPercentage = totalDocuments > 0
      ? Math.round((verifiedDocuments / totalDocuments) * 1000) / 10
      : 0;
    const grossSales = documents.reduce((sum, doc) =>
      sum + parseFloat(String(doc.MntTotal || 0)), 0
    );

    // Obtener datos de últimos 3 meses para comparación
    const monthlyComparison: MonthlyComparisonData[] = [];
    for (let i = 0; i < 3; i++) {
      const compareDate = new Date(year, month - i, 1);
      const compareYear = compareDate.getFullYear();
      const compareMonth = compareDate.getMonth();
      const compareDateRange = getMonthDateRange(compareYear, compareMonth);

      const monthDocs = await fetchERPDocuments(ciSession, user.codigo_vendedor, compareDateRange);

      monthlyComparison.push({
        month: `${compareYear}-${String(compareMonth + 1).padStart(2, '0')}`,
        monthLabel: MONTH_NAMES[compareMonth],
        grossSales: monthDocs.reduce((sum, doc) => sum + parseFloat(String(doc.MntTotal || 0)), 0),
        documentsCount: monthDocs.length
      });
    }

    // Obtener historial de comisiones (últimos 6 meses + actual)
    const commissionsHistory: CommissionHistoryData[] = [];
    const porcentaje = user.porcentaje_comision || 0;
    const comisionBase = user.comision_base || 0;

    for (let i = 0; i < 7; i++) {
      const histDate = new Date(year, month - i, 1);
      const histYear = histDate.getFullYear();
      const histMonth = histDate.getMonth();
      const histDateRange = getMonthDateRange(histYear, histMonth);

      const histDocs = await fetchERPDocuments(ciSession, user.codigo_vendedor, histDateRange);

      // Calcular comisión del mes
      let monthCommission = 0;
      for (const doc of histDocs) {
        monthCommission += calculateCommission(doc, porcentaje, comisionBase);
      }
      if (histDocs.length > 0) {
        monthCommission += comisionBase;
      }

      const commissionData = {
        month: `${histYear}-${String(histMonth + 1).padStart(2, '0')}`,
        monthLabel: MONTH_NAMES[histMonth],
        commission: Math.round(monthCommission)
      };
      console.log('[VENDOR METRICS] Historial comisión:', commissionData.monthLabel, '=', commissionData.commission, '(docs:', histDocs.length, ')');
      commissionsHistory.push(commissionData);
    }

    // Encontrar mejor mes (basado en ventas brutas)
    let bestMonth: BestMonthData = {
      month: selectedMonth,
      monthLabel: MONTH_NAMES[month],
      year: year,
      grossSales: grossSales,
      commission: 0
    };

    // Buscar en el historial el mejor mes
    for (const monthData of monthlyComparison) {
      if (monthData.grossSales > bestMonth.grossSales) {
        const [y, m] = monthData.month.split('-');
        bestMonth = {
          month: monthData.month,
          monthLabel: monthData.monthLabel,
          year: parseInt(y),
          grossSales: monthData.grossSales,
          commission: commissionsHistory.find(c => c.month === monthData.month)?.commission || 0
        };
      }
    }

    // Comparación mes anterior vs actual
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevDateRange = getMonthDateRange(prevYear, prevMonth);
    const prevDocs = await fetchERPDocuments(ciSession, user.codigo_vendedor, prevDateRange);

    const prevVerifications = await prisma.paymentVerification.findMany({
      where: {
        vendorCode: user.codigo_vendedor,
        status: 'APPROVED',
        createdAt: {
          gte: new Date(prevYear, prevMonth, 1),
          lte: new Date(prevYear, prevMonth + 1, 0, 23, 59, 59)
        }
      }
    });

    const prevVerifiedDocNumbers = new Set(
      prevVerifications.map(v => `${v.documentType}-${v.documentNumber}`)
    );

    let prevCommission = 0;
    for (const doc of prevDocs) {
      prevCommission += calculateCommission(doc, porcentaje, comisionBase);
    }
    if (prevDocs.length > 0) prevCommission += comisionBase;

    let currentCommission = 0;
    for (const doc of documents) {
      currentCommission += calculateCommission(doc, porcentaje, comisionBase);
    }
    if (documents.length > 0) currentCommission += comisionBase;

    // Construir respuesta
    const metrics: VendorMetrics = {
      currentMonth: {
        totalDocuments,
        verifiedDocuments,
        pendingDocuments,
        progressPercentage,
        grossSales
      },
      monthlyComparison: monthlyComparison.reverse(), // Ordenar cronológicamente
      commissionsHistory: commissionsHistory.reverse(),
      bestMonth,
      monthComparison: {
        previousMonth: {
          label: MONTH_NAMES[prevMonth],
          commission: Math.round(prevCommission),
          documentsTotal: prevDocs.length,
          documentsVerified: prevDocs.filter(doc =>
            prevVerifiedDocNumbers.has(`${doc.TipoDoc}-${doc.NumDoc}`)
          ).length
        },
        currentMonth: {
          label: MONTH_NAMES[month],
          commission: Math.round(currentCommission),
          documentsTotal: totalDocuments,
          documentsVerified: verifiedDocuments
        }
      },
      documentDistribution: [
        { name: 'Verificados', value: verifiedDocuments, color: '#22c55e' },
        { name: 'Pendientes', value: pendingDocuments, color: '#f97316' }
      ]
    };

    const vendorInfo: VendorInfo = {
      codigoVendedor: user.codigo_vendedor,
      porcentajeComision: user.porcentaje_comision,
      comisionBase: user.comision_base
    };

    return NextResponse.json({
      success: true,
      metrics,
      vendorInfo,
      selectedMonth
    });

  } catch (error) {
    console.error('[VENDOR METRICS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
