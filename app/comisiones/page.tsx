
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { Loader2, Calculator, Search, AlertCircle, Calendar, DollarSign, TrendingUp, CheckCircle, XCircle, Eye, FileText } from 'lucide-react';
import { CommissionDetailModal } from '@/components/ui/commission-detail-modal';
import { ERPDocument, DocumentReference } from '@/lib/types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Interface para datos de vendedores
interface VendorData {
  id: string;
  nombre: string;
  codigo_vendedor: string;
  porcentaje_comision: number | null;
  comision_base: number | null;
  perfil: string;
}

// Interface para detalle de documento
interface DocumentoDetalle {
  numDoc: string;
  tipoDoc: string;
  fecha: string;
  cliente: string;
  montoNeto: number;
  montoBruto: number; // Nuevo campo
  totalVerificado: number;
  montoFlete: number;
  baseComision: number; // totalVerificado - flete
  porcentajeAplicado: number;
  comisionCalculada: number;
}

// Interface para datos de comisiones calculadas
interface ComisionData {
  vendedor: string;
  codigoVendedor: string;
  totalVenta: number; // Renombrado de totalComision
  comisionReal: number; // Nueva columna
  cantidadDocumentos: number;
  documentosValidos: number;
  documentosRechazados: number;
  esUsuarioRegistrado: boolean; // Indicador de si existe como usuario
  porcentajeComision: number | null; // % comisión del usuario
  comisionBase: number | null; // Comisión base del usuario
  totalVerificaciones: number; // Total de verificaciones aprobadas
  documentosConMultiplesVerificaciones: number; // Documentos con más de una verificación
  documentosDetalle: DocumentoDetalle[]; // Nuevo campo para detalles
  montoBrutoTotal: number; // Nuevo campo para el monto bruto total
}

export default function ComisionesPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<ERPDocument[]>([]);
  const [comisiones, setComisiones] = useState<ComisionData[]>([]);
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ciSession, setCiSession] = useState<string | null>(null);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalComisiones, setTotalComisiones] = useState(0);

  // Funciones para paginación
  const totalPages = Math.ceil(totalComisiones / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentComisiones = comisiones.slice(startIndex, endIndex);

  // Función para cambiar página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Función para cambiar items por página
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Función para resetear paginación cuando cambien filtros
  const resetPagination = () => {
    setCurrentPage(1);
  };
  
  // Generar rango de fechas por defecto (mes actual)
  const getCurrentMonthRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };
    
    return {
      startDate: formatDate(startOfMonth),
      endDate: formatDate(endOfMonth),
      range: `${formatDate(startOfMonth)} a ${formatDate(endOfMonth)}`
    };
  };

  // Estados para filtros
  const [filters, setFilters] = useState(() => {
    const defaultRange = getCurrentMonthRange();
    const user = session?.user as any;
    
    // Si es vendedor o planificador, establecer automáticamente su código
    const defaultCodVend = ((user?.perfil === 'vendedor' || user?.perfil === 'planificador') && user?.codigo_vendedor) 
      ? user.codigo_vendedor 
      : '';
      
    return {
      CodVend: defaultCodVend,
      FchDoc: defaultRange.range,
      FchDocStart: defaultRange.startDate,
      FchDocEnd: defaultRange.endDate,
    };
  });

  // Función para actualizar el rango de fechas
  const updateDateRange = (startDate: string, endDate: string) => {
    const range = `${startDate} a ${endDate}`;
    setFilters(prev => ({
      ...prev,
      FchDocStart: startDate,
      FchDocEnd: endDate,
      FchDoc: range
    }));
  };

  // Función para aplicar filtros automáticamente
  const applyFilters = async () => {
    if (ciSession) {
      await loadDocuments();
    }
  };

  // Función para cargar vendedores
  const loadVendors = async () => {
    try {
      const response = await fetch('/api/users/vendors');
      const data = await response.json();
      
      if (data.success) {
        setVendors(data.vendors || []);
        console.log('Vendedores cargados:', data.vendors?.length || 0);
      } else {
        console.error('Error cargando vendedores:', data.error);
      }
    } catch (error) {
      console.error('Error cargando vendedores:', error);
    }
  };


  // Efecto para cargar vendedores al montar el componente
  useEffect(() => {
    loadVendors();
  }, []);

  // Efecto para establecer el filtro de vendedor cuando la sesión esté disponible
  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      if ((user.perfil === 'vendedor' || user.perfil === 'planificador') && user.codigo_vendedor) {
        setFilters(prev => ({
          ...prev,
          CodVend: user.codigo_vendedor
        }));
      }
    }
  }, [session]);

  // Efecto para aplicar filtros cuando cambien (con debounce)
  useEffect(() => {
    if (!ciSession) return; // No aplicar filtros si no hay sesión
    
    const timeoutId = setTimeout(() => {
      resetPagination();
      applyFilters();
    }, 1000); // Aumentar debounce a 1 segundo

    return () => clearTimeout(timeoutId);
  }, [filters, ciSession]);

  // Estado para las credenciales ERP
  const [erpCredentials, setErpCredentials] = useState<{
    txtrutempresa: string;
    txtusuario: string;
    txtpwd: string;
  } | null>(null);

  // Función para obtener credenciales ERP
  const fetchERPCredentials = async () => {
    try {
      const response = await fetch('/api/erp-credentials', {
        cache: 'no-store'
      });
      if (response.ok) {
        const creds = await response.json();
        setErpCredentials(creds);
        return creds;
      }
      throw new Error('Error obteniendo credenciales');
    } catch (error) {
      console.error('Error fetching ERP credentials:', error);
      setError('Error obteniendo credenciales ERP');
      return null;
    }
  };

  // Función para autenticar con ERP
  const authenticateERP = async () => {
    try {
      setLoading(true);
      setError(null);

      // Siempre obtener las credenciales más recientes
      const credentials = await fetchERPCredentials();
      if (!credentials) {
        throw new Error('No se pudieron obtener las credenciales ERP');
      }

      // Paso 1: Autenticación inicial con timeout
      const authResponse = await Promise.race([
        fetch('/api/erp/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout en autenticación')), 30000)
        )
      ]) as Response;

      const authData = await authResponse.json();
      
      if (!authData.success) {
        throw new Error(authData.error || 'Error en autenticación');
      }

      // Paso 2: Obtener sesión con timeout
      const sessionResponse = await Promise.race([
        fetch('/api/erp/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ redirectUrl: authData.redirectUrl }),
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout en sesión')), 30000)
        )
      ]) as Response;

      const sessionData = await sessionResponse.json();
      
      if (!sessionData.success) {
        throw new Error(sessionData.error || 'Error obteniendo sesión');
      }

      setCiSession(sessionData.ci_session);
      toast.success('Autenticación ERP exitosa');
      
      // NO cargar documentos automáticamente - solo cuando el usuario lo solicite
      
    } catch (error) {
      console.error('Error autenticando ERP:', error);
      setError(error instanceof Error ? error.message : 'Error de autenticación');
      toast.error('Error en autenticación ERP');
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar documentos y calcular comisiones
  const loadDocuments = async (sessionId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const sessionToUse = sessionId || ciSession;
      if (!sessionToUse) {
        throw new Error('Sesión ERP no disponible');
      }

      // Preparar filtros para enviar al API - solo cotizaciones para comisiones
      const filtersToSend = {
        TipoDoc: 'CT', // Solo cotizaciones para comisiones
        CodVend: filters.CodVend,
        FchDoc: filters.FchDoc,
      };

      console.log('Cargando documentos para comisiones:', filtersToSend);

      // Cargar documentos ERP, verificaciones de pago Y vendedores en paralelo
      const [documentsResponse, verificationsResponse, vendorsResponse] = await Promise.all([
        Promise.race([
          fetch('/api/erp/documents', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ci_session: sessionToUse,
              filters: filtersToSend
            }),
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout al cargar documentos')), 60000)
          )
        ]) as Promise<Response>,
        fetch('/api/payment-verifications'),
        fetch('/api/users/vendors')
      ]);

      const documentsData = await documentsResponse.json();
      const verificationsData = await verificationsResponse.json();
      const vendorsData = await vendorsResponse.json();
      
      if (!documentsData.success) {
        throw new Error(documentsData.error || 'Error cargando documentos');
      }

      if (!verificationsData.success) {
        console.warn('No se pudieron cargar verificaciones de pago:', verificationsData.error);
      }

      if (!vendorsData.success) {
        console.warn('No se pudieron cargar vendedores:', vendorsData.error);
      }

      const docs = documentsData.documents || [];
      const verifications = verificationsData.success ? verificationsData.verifications : [];
      const currentVendors = vendorsData.success ? vendorsData.vendors : [];
      
      // Actualizar estado de vendedores para próximas operaciones
      setVendors(currentVendors);
      console.log('Vendedores cargados para cálculo:', currentVendors.length);
      
      // Limitar procesamiento para evitar sobrecarga de memoria
      const MAX_DOCS = 1000;
      if (docs.length > MAX_DOCS) {
        toast.warning(`Limitando procesamiento a ${MAX_DOCS} documentos de ${docs.length} encontrados`);
        docs.splice(MAX_DOCS);
      }
      
      setDocuments(docs);
      
      
      // Calcular comisiones de forma segura incluyendo verificaciones
      try {
        const comisionesCalculadas = calculateComisiones(docs, verifications, currentVendors);
        
        // Filtrar comisiones según el perfil del usuario
        const user = session?.user as any;
        let comisionesFiltradas = comisionesCalculadas;
        
        if ((user?.perfil === 'vendedor' || user?.perfil === 'planificador') && user?.codigo_vendedor) {
          // Los vendedores y planificadores solo ven sus propias comisiones
          comisionesFiltradas = comisionesCalculadas.filter(
            comision => comision.codigoVendedor === user.codigo_vendedor
          );
        }
        
        setComisiones(comisionesFiltradas);
        setTotalComisiones(comisionesFiltradas.length);
        
        const approvedVerifications = verifications.filter((v: any) => v.status === 'APPROVED').length;
        const totalDocsWithMultiplePayments = comisionesFiltradas.reduce((sum, c) => sum + c.documentosConMultiplesVerificaciones, 0);
        toast.success(`${docs.length} documentos procesados, ${approvedVerifications} pagos aprobados (${totalDocsWithMultiplePayments} docs con múltiples pagos), ${comisionesFiltradas.length} vendedor(es) con comisiones`);
      } catch (calcError) {
        console.error('Error calculando comisiones:', calcError);
        setError('Error en cálculo de comisiones');
        toast.error('Error calculando comisiones');
      }
      
    } catch (error) {
      console.error('Error cargando documentos:', error);
      setError(error instanceof Error ? error.message : 'Error cargando documentos');
      toast.error('Error cargando documentos');
    } finally {
      setLoading(false);
    }
  };

  // Función para parsear las referencias del campo Desglose
  const parseDocumentReferences = (desglose: string | undefined): DocumentReference[] => {
    if (!desglose) return [];
    
    try {
      const parsed = JSON.parse(desglose);
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (typeof parsed === 'object') {
        return [parsed];
      }
      return [];
    } catch (error) {
      console.error('Error parsing Desglose JSON:', error);
      return [];
    }
  };

  // Función principal para calcular comisiones
  const calculateComisiones = (documents: ERPDocument[], verifications: any[] = [], currentVendors: VendorData[] = []): ComisionData[] => {
    console.log('🚀 CALCULANDO COMISIONES...');
    
    const vendedoresMap = new Map<string, ComisionData>();

    // Crear un mapa de verificaciones aprobadas para búsqueda rápida
    // Ahora almacena un array de verificaciones para manejar múltiples pagos por documento
    const approvedVerificationsMap = new Map<string, any[]>();
    const totalVerifications = verifications.length;
    const approvedVerifications = verifications.filter(v => v.status === 'APPROVED');
    
    approvedVerifications.forEach(v => {
      const key = `${v.documentType}-${v.documentNumber}`;
      if (!approvedVerificationsMap.has(key)) {
        approvedVerificationsMap.set(key, []);
      }
      approvedVerificationsMap.get(key)!.push(v);
    });

    // console.log(`📊 Verificaciones procesadas: ${totalVerifications} total, ${approvedVerifications.length} aprobadas, ${approvedVerificationsMap.size} documentos únicos con verificaciones`);
    

    documents.forEach(doc => {
      const vendedor = doc.Vendedor || 'Sin Vendedor';
      const codigoVendedor = doc.CodVend || doc.Vendedor || '';
      const montoNeto = parseFloat(String(doc.MntNeto || 0));
      const estadoDoc = doc.EstadoDoc;
      
      // Buscar el vendedor en la lista de usuarios
      const vendorUser = currentVendors.find(v => v.codigo_vendedor === codigoVendedor);
      
      // Reducir logging de vendedores para mejorar performance
      // if (codigoVendedor && !vendorUser) {
      //   console.log(`⚠️ Vendedor ${codigoVendedor} no encontrado en lista de usuarios registrados`);
      // } else if (vendorUser) {
      //   console.log(`✅ Vendedor ${codigoVendedor} encontrado: ${vendorUser.nombre}, comisión: ${vendorUser.porcentaje_comision}%`);
      // }
      
      // Inicializar vendedor si no existe
      if (!vendedoresMap.has(vendedor)) {
        vendedoresMap.set(vendedor, {
          vendedor,
          codigoVendedor,
          totalVenta: 0, // Suma de bases de comisión (montos netos ajustados)
          comisionReal: 0, // Suma de comisiones calculadas por documento
          cantidadDocumentos: 0,
          documentosValidos: 0,
          documentosRechazados: 0,
          esUsuarioRegistrado: !!vendorUser, // Indicador de si existe como usuario
          porcentajeComision: vendorUser?.porcentaje_comision || null,
          comisionBase: vendorUser?.comision_base || null,
          totalVerificaciones: 0,
          documentosConMultiplesVerificaciones: 0,
          documentosDetalle: [], // Inicializar array de detalles
          montoBrutoTotal: 0, // Inicializar monto bruto total
        });
      }

      const vendedorData = vendedoresMap.get(vendedor)!;
      vendedorData.cantidadDocumentos++;

      // NUEVA LÓGICA: Verificar si este documento tiene verificación de pago aprobada
      const docKey = `${doc.TipoDoc}-${doc.NumDoc}`;
      const documentVerifications = approvedVerificationsMap.get(docKey) || [];

      // console.log(`🔍 Documento ${doc.NumDoc} (${doc.TipoDoc}): ${documentVerifications.length} verificaciones encontradas`);

      // Solo considerar documentos con verificación de pago aprobada
      if (documentVerifications.length === 0) {
        vendedorData.documentosRechazados++;
        // console.log(`❌ Documento ${doc.NumDoc} rechazado: sin verificación de pago aprobada`);
        return;
      }

      // Calcular el total verificado excluyendo flete/transporte (suma de verificaciones no-flete)
      const totalVerificadoSinFlete = documentVerifications
        .filter(v => v.paymentMethod !== 'flete' && v.paymentMethod !== 'transporte')
        .reduce((sum, verification) => sum + (verification.amount || 0), 0);
      
      // Calcular el monto de flete (suma de verificaciones con método 'flete')
      const montoFleteBruto = documentVerifications
        .filter(v => v.paymentMethod === 'flete' || v.paymentMethod === 'transporte')
        .reduce((sum, verification) => sum + (verification.amount || 0), 0);
      
      // Calcular el flete neto (sin IVA) dividiendo por 1.19
      const montoFleteNeto = montoFleteBruto / 1.19;

      // Total verificado incluyendo flete (para mostrar en detalles)
      const totalVerificado = totalVerificadoSinFlete + montoFleteBruto;
      
      // Obtener monto bruto del documento
      const montoBruto = parseFloat(String(doc.MntTotal || 0));
      
      // NUEVA VALIDACIÓN: Total de verificaciones debe ser IGUAL al monto bruto
      // Solo se consideran documentos donde el monto verificado (incluyendo transporte) sea igual al monto bruto
      const tolerancia = 1; // Tolerancia de $1 peso para redondeos
      const diferenciaAbsoluta = Math.abs(totalVerificado - montoBruto);
      
      if (diferenciaAbsoluta > tolerancia) {
        vendedorData.documentosRechazados++;
        console.log(`❌ Documento ${doc.NumDoc} rechazado: verificaciones (${totalVerificado}) != monto bruto (${montoBruto}), diferencia: ${diferenciaAbsoluta}`);
        return;
      }

      // Solo loggear documentos aprobados para debugging
      console.log(`✅ Documento ${doc.NumDoc} aprobado: verificaciones (${totalVerificado}) = monto bruto (${montoBruto})`);

      // Rechazar documentos que solo tienen flete (sin pagos reales)
      if (totalVerificadoSinFlete === 0) {
        vendedorData.documentosRechazados++;
        console.log(`❌ Documento ${doc.NumDoc} rechazado adicional: solo tiene flete, sin pagos reales para comisión`);
        return;
      }

      // Actualizar contadores de verificaciones
      vendedorData.totalVerificaciones += documentVerifications.length;
      if (documentVerifications.length > 1) {
        vendedorData.documentosConMultiplesVerificaciones++;
      }
      
      // Acumular monto bruto total
      vendedorData.montoBrutoTotal += montoBruto;
      
      // NUEVA LÓGICA SIMPLIFICADA: 
      // Si llegamos aquí, el documento tiene verificaciones == monto bruto
      // Usamos el monto neto como base para la comisión

      // Calcular el monto neto ajustado (monto neto menos flete neto)
      const montoNetoAjustado = montoNeto - montoFleteNeto;
      
      // Usar el monto neto ajustado como base para comisión
      const ventaAnterior = vendedorData.totalVenta;
      vendedorData.totalVenta += montoNetoAjustado;
      vendedorData.documentosValidos++;
      console.log(`   ➕ SUMA A TOTAL VENTA: ${ventaAnterior} + ${montoNetoAjustado} = ${vendedorData.totalVenta}`);
      console.log(`      (Monto Neto: ${montoNeto} - Flete Neto: ${montoFleteNeto} = ${montoNetoAjustado})`);
      
      // Crear detalle del documento y calcular comisión individual
      const porcentajeAplicado = vendedorData.porcentajeComision || 0;
      const comisionPorcentaje = montoNetoAjustado * porcentajeAplicado / 100;
      // La comisión base se aplica una vez por vendedor, no por documento
      const comisionCalculada = comisionPorcentaje;
      
      // Acumular la comisión calculada para este documento
      if (vendedorData.esUsuarioRegistrado && vendedorData.porcentajeComision !== null) {
        vendedorData.comisionReal += comisionCalculada;
        console.log(`   💰 COMISIÓN DOCUMENTO: ${montoNetoAjustado} × ${porcentajeAplicado}% = ${comisionCalculada}`);
        console.log(`   📈 COMISIÓN ACUMULADA: ${vendedorData.comisionReal}`);
      }
      
      vendedorData.documentosDetalle.push({
        numDoc: doc.NumDoc || '',
        tipoDoc: doc.TipoDoc || '',
        fecha: doc.FchDoc || '',
        cliente: doc.NomCliente || '',
        montoNeto: montoNetoAjustado, // Ahora muestra el monto neto ajustado
        montoBruto: montoBruto, // Agregamos el monto bruto
        totalVerificado: totalVerificado,
        montoFlete: montoFleteNeto, // Ahora muestra el flete neto (sin IVA)
        baseComision: montoNetoAjustado, // Base de comisión es el monto neto ajustado
        porcentajeAplicado: porcentajeAplicado,
        comisionCalculada: comisionPorcentaje
      });
    });

    // Mostrar resumen final de comisiones (ya calculadas documento por documento)
    console.log('\n💰 RESUMEN FINAL DE COMISIONES:');
    Array.from(vendedoresMap.values()).forEach(vendedorData => {
      console.log(`\n👤 Vendedor: ${vendedorData.vendedor} (${vendedorData.codigoVendedor})`);
      console.log(`   📊 Total Base Venta: $${vendedorData.totalVenta}`);
      console.log(`   📈 Docs Válidos: ${vendedorData.documentosValidos}`);
      console.log(`   📉 Docs Rechazados: ${vendedorData.documentosRechazados}`);
      console.log(`   ✅ Usuario Registrado: ${vendedorData.esUsuarioRegistrado}`);
      console.log(`   📍 % Comisión: ${vendedorData.porcentajeComision}`);
      console.log(`   💵 Comisión Base: ${vendedorData.comisionBase}`);
      console.log(`   💰 COMISIÓN TOTAL ACUMULADA: $${vendedorData.comisionReal}`);
      
      // Asegurar que usuarios no registrados tengan comisión 0
      if (!vendedorData.esUsuarioRegistrado || vendedorData.porcentajeComision === null) {
        vendedorData.comisionReal = 0;
        console.log(`   ❌ Comisión ajustada a $0 - No registrado o sin % configurado`);
      } else {
        // Agregar comisión base una sola vez por vendedor
        const comisionBase = vendedorData.comisionBase || 0;
        if (comisionBase > 0) {
          vendedorData.comisionReal += comisionBase;
          console.log(`   💵 COMISIÓN BASE AGREGADA: +${comisionBase} = ${vendedorData.comisionReal}`);
        }
      }
    });

    // Convertir Map a Array y ordenar por total de venta descendente
    return Array.from(vendedoresMap.values())
      .sort((a, b) => b.totalVenta - a.totalVenta);
  };

  // Función para formatear moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(value);
  };

  // Calcular totales generales
  const totalGeneralVentas = comisiones.reduce((total, item) => total + item.totalVenta, 0);
  const totalGeneralComisiones = comisiones.reduce((total, item) => total + item.comisionReal, 0);
  const totalDocumentosValidos = comisiones.reduce((total, item) => total + item.documentosValidos, 0);
  const totalDocumentosRechazados = comisiones.reduce((total, item) => total + item.documentosRechazados, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comisiones</h1>
          <p className="text-muted-foreground">
            Cálculo de comisiones por vendedor basado en documentos ERP
          </p>
        </div>

        {/* Resumen de totales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalGeneralVentas)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Comisiones</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalGeneralComisiones)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendedores</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{comisiones.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Docs. Válidos</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDocumentosValidos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Docs. Pendientes</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDocumentosRechazados}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtros de Búsqueda
            </CardTitle>
            <CardDescription>
              Los filtros se aplican automáticamente conforme escribe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Rango de Fechas */}
              <div className="md:col-span-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Rango de Fechas
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label htmlFor="FchDocStart" className="text-xs text-muted-foreground">Desde</Label>
                    <Input
                      id="FchDocStart"
                      type="date"
                      value={filters.FchDocStart}
                      onChange={(e) => updateDateRange(e.target.value, filters.FchDocEnd)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="FchDocEnd" className="text-xs text-muted-foreground">Hasta</Label>
                    <Input
                      id="FchDocEnd"
                      type="date"
                      value={filters.FchDocEnd}
                      onChange={(e) => updateDateRange(filters.FchDocStart, e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Código Vendedor */}
              <div>
                <Label htmlFor="CodVend">Código Vendedor</Label>
                <Input
                  id="CodVend"
                  value={filters.CodVend}
                  onChange={(e) => setFilters(prev => ({ ...prev, CodVend: e.target.value }))}
                  placeholder="Filtrar por vendedor..."
                  readOnly={((session?.user as any)?.perfil === 'vendedor' || (session?.user as any)?.perfil === 'planificador')}
                  className={((session?.user as any)?.perfil === 'vendedor' || (session?.user as any)?.perfil === 'planificador') ? 'bg-muted' : ''}
                />
                {((session?.user as any)?.perfil === 'vendedor' || (session?.user as any)?.perfil === 'planificador') && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Como vendedor/planificador, solo puedes ver tus propias comisiones
                  </p>
                )}
              </div>
            </div>
            
            {/* Botones de control */}
            <div className="mt-4 flex gap-2">
              {!ciSession ? (
                <Button 
                  onClick={authenticateERP}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Conectar a ERP
                </Button>
              ) : (
                <Button 
                  onClick={() => loadDocuments()}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4" />
                  )}
                  Calcular Comisiones
                </Button>
              )}
              
              
              <Button 
                variant="outline"
                onClick={() => {
                  const defaultRange = getCurrentMonthRange();
                  const user = session?.user as any;
                  
                  // Si es vendedor o planificador, mantener su código; si no, limpiar
                  const defaultCodVend = ((user?.perfil === 'vendedor' || user?.perfil === 'planificador') && user?.codigo_vendedor) 
                    ? user.codigo_vendedor 
                    : '';
                    
                  setFilters({
                    CodVend: defaultCodVend,
                    FchDoc: defaultRange.range,
                    FchDocStart: defaultRange.startDate,
                    FchDocEnd: defaultRange.endDate,
                  });
                  resetPagination();
                }}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Limpiar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabla de comisiones */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Comisiones por Vendedor</CardTitle>
                <CardDescription>
                  {totalComisiones > 0 ? (
                    <>
                      Mostrando {startIndex + 1} - {Math.min(endIndex, totalComisiones)} de {totalComisiones} vendedor(es)
                    </>
                  ) : (
                    'No se encontraron comisiones'
                  )}
                </CardDescription>
              </div>
              {totalComisiones > 0 && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="itemsPerPage" className="text-sm whitespace-nowrap">Mostrar:</Label>
                  <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">por página</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Calculando comisiones...</span>
              </div>
            ) : totalComisiones === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron comisiones para el período seleccionado
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Usuario</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Código Vendedor</TableHead>
                      <TableHead className="text-right">Monto Bruto</TableHead>
                      <TableHead className="text-right">Total Venta</TableHead>
                      <TableHead className="text-right">Comisión Real</TableHead>
                      <TableHead className="text-center">% Comisión</TableHead>
                      <TableHead className="text-center">Docs. Válidos</TableHead>
                      <TableHead className="text-center">Docs. Pendientes</TableHead>
                      <TableHead className="text-center">% Efectividad</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentComisiones.map((comision, index) => {
                      const efectividad = comision.cantidadDocumentos > 0 
                        ? (comision.documentosValidos / comision.cantidadDocumentos * 100).toFixed(1)
                        : '0';
                      
                      return (
                        <TableRow key={index}>
                          {/* Indicador de usuario registrado */}
                          <TableCell className="text-center">
                            {comision.esUsuarioRegistrado ? (
                              <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                            )}
                          </TableCell>
                          
                          <TableCell className="font-medium">{comision.vendedor}</TableCell>
                          <TableCell>{comision.codigoVendedor || '-'}</TableCell>
                          
                          {/* Monto Bruto */}
                          <TableCell className="text-right font-bold text-purple-600">
                            {formatCurrency(comision.montoBrutoTotal)}
                          </TableCell>
                          
                          {/* Total Venta */}
                          <TableCell className="text-right font-bold text-blue-600">
                            {formatCurrency(comision.totalVenta)}
                          </TableCell>
                          
                          {/* Comisión Real */}
                          <TableCell className="text-right font-bold text-green-600">
                            {comision.esUsuarioRegistrado ? formatCurrency(comision.comisionReal) : '-'}
                          </TableCell>
                          
                          {/* % Comisión */}
                          <TableCell className="text-center">
                            {comision.esUsuarioRegistrado && comision.porcentajeComision !== null ? (
                              <Badge variant="outline">
                                {comision.porcentajeComision}%
                              </Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          
                          <TableCell className="text-center">
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              {comision.documentosValidos}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive">
                              {comision.documentosRechazados}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={parseFloat(efectividad) >= 80 ? 'default' : parseFloat(efectividad) >= 60 ? 'secondary' : 'destructive'}>
                              {efectividad}%
                            </Badge>
                          </TableCell>
                          
                          {/* Acciones */}
                          <TableCell className="text-center">
                            <CommissionDetailModal
                              vendorName={comision.vendedor}
                              vendorCode={comision.codigoVendedor}
                              documentosDetalle={comision.documentosDetalle || []}
                              porcentajeComision={comision.porcentajeComision}
                              comisionBase={comision.comisionBase}
                            >
                              <Button variant="outline" size="sm" className="flex items-center gap-2">
                                <Eye className="h-3 w-3" />
                                Detalle
                              </Button>
                            </CommissionDetailModal>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Paginación */}
            {totalComisiones > itemsPerPage && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                        className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {/* Números de página */}
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNumber: number;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            onClick={() => handlePageChange(pageNumber)}
                            isActive={currentPage === pageNumber}
                            className="cursor-pointer"
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    {/* Mostrar ellipsis y última página si es necesario */}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => handlePageChange(totalPages)}
                            className="cursor-pointer"
                          >
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                        className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
