
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
import { Loader2, Calculator, Search, AlertCircle, Calendar, DollarSign, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { ERPDocument, DocumentReference } from '@/lib/types';
import { toast } from 'sonner';

// Interface para datos de vendedores
interface VendorData {
  id: string;
  nombre: string;
  codigo_vendedor: string;
  porcentaje_comision: number | null;
  comision_base: number | null;
  perfil: string;
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
    return {
      CodVend: '',
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

  // Efecto para inicializar automáticamente al montar el componente
  useEffect(() => {
    loadVendors();
    authenticateERP();
  }, []);

  // Efecto para aplicar filtros cuando cambien (con debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (ciSession) {
        resetPagination();
        applyFilters();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters, ciSession]);

  // Credenciales ERP
  const erpCredentials = {
    txtrutempresa: '77261114-5',
    txtusuario: '18221084-6',
    txtpwd: 'Rguz0608'
  };

  // Función para autenticar con ERP
  const authenticateERP = async () => {
    try {
      setLoading(true);
      setError(null);

      // Paso 1: Autenticación inicial
      const authResponse = await fetch('/api/erp/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(erpCredentials),
      });

      const authData = await authResponse.json();
      
      if (!authData.success) {
        throw new Error(authData.error || 'Error en autenticación');
      }

      // Paso 2: Obtener sesión
      const sessionResponse = await fetch('/api/erp/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ redirectUrl: authData.redirectUrl }),
      });

      const sessionData = await sessionResponse.json();
      
      if (!sessionData.success) {
        throw new Error(sessionData.error || 'Error obteniendo sesión');
      }

      setCiSession(sessionData.ci_session);
      toast.success('Autenticación ERP exitosa');
      
      // Cargar documentos automáticamente después de autenticar
      await loadDocuments(sessionData.ci_session);
      
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

      const response = await fetch('/api/erp/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ci_session: sessionToUse,
          filters: filtersToSend
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error cargando documentos');
      }

      const docs = data.documents || [];
      setDocuments(docs);
      
      // Calcular comisiones
      const comisionesCalculadas = calculateComisiones(docs);
      setComisiones(comisionesCalculadas);
      setTotalComisiones(comisionesCalculadas.length);
      
      toast.success(`${docs.length} documentos cargados, ${comisionesCalculadas.length} vendedores con comisiones`);
      
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
  const calculateComisiones = (documents: ERPDocument[]): ComisionData[] => {
    const vendedoresMap = new Map<string, ComisionData>();

    documents.forEach(doc => {
      const vendedor = doc.Vendedor || 'Sin Vendedor';
      const codigoVendedor = doc.CodVend || doc.Vendedor || '';
      const montoNeto = parseFloat(String(doc.MntNeto || 0));
      const estadoDoc = doc.EstadoDoc;
      
      // Buscar el vendedor en la lista de usuarios
      const vendorUser = vendors.find(v => v.codigo_vendedor === codigoVendedor);
      
      // Inicializar vendedor si no existe
      if (!vendedoresMap.has(vendedor)) {
        vendedoresMap.set(vendedor, {
          vendedor,
          codigoVendedor,
          totalVenta: 0, // Renombrado de totalComision
          comisionReal: 0, // Nueva columna
          cantidadDocumentos: 0,
          documentosValidos: 0,
          documentosRechazados: 0,
          esUsuarioRegistrado: !!vendorUser, // Indicador de si existe como usuario
          porcentajeComision: vendorUser?.porcentaje_comision || null,
          comisionBase: vendorUser?.comision_base || null,
        });
      }

      const vendedorData = vendedoresMap.get(vendedor)!;
      vendedorData.cantidadDocumentos++;

      // NUEVA LÓGICA: Estado "P" se considera válido como pendiente
      if (estadoDoc === 'P') {
        // Para documentos con estado "P" (pendiente), usar MntNeto directamente
        vendedorData.totalVenta += montoNeto;
        vendedorData.documentosValidos++;
        console.log(`Documento ${doc.NumDoc} con estado "P" considerado válido: ${montoNeto}`);
        return;
      }

      // Procesar referencias del Desglose para otros estados
      const referencias = parseDocumentReferences(doc.Desglose);
      
      if (referencias.length === 0) {
        vendedorData.documentosRechazados++;
        return;
      }

      // Filtrar referencias por codtipodoc 33 o 39
      const referenciasFiltradas = referencias.filter(ref => {
        const codTipoDoc = ref.codtipodoc || ref.CodTipoDoc || ref.tipo;
        return codTipoDoc === 33 || codTipoDoc === 39 || codTipoDoc === '33' || codTipoDoc === '39';
      });

      if (referenciasFiltradas.length === 0) {
        vendedorData.documentosRechazados++;
        return;
      }

      // Calcular suma total del desglose
      const sumaDesglose = referenciasFiltradas.reduce((suma, ref) => {
        const monto = parseFloat(String(ref.MontoEERR || ref.monto || 0));
        return suma + monto;
      }, 0);

      // Validar que suma desglose ≤ montoneto + 5 pesos (margen)
      const margen = 5;
      if (sumaDesglose > montoNeto + margen) {
        vendedorData.documentosRechazados++;
        console.log(`Documento ${doc.NumDoc} rechazado: suma desglose (${sumaDesglose}) > monto neto + margen (${montoNeto + margen})`);
        return;
      }

      // Sumar MontoEERR válido (ahora es totalVenta)
      vendedorData.totalVenta += sumaDesglose;
      vendedorData.documentosValidos++;
    });

    // Calcular comisión real para cada vendedor
    Array.from(vendedoresMap.values()).forEach(vendedorData => {
      if (vendedorData.esUsuarioRegistrado && vendedorData.porcentajeComision !== null) {
        // Comisión Real = (Total Venta × % comisión) + comisión base
        const porcentaje = vendedorData.porcentajeComision / 100; // Convertir porcentaje a decimal
        const comisionBase = vendedorData.comisionBase || 0;
        vendedorData.comisionReal = (vendedorData.totalVenta * porcentaje) + comisionBase;
      } else {
        vendedorData.comisionReal = 0; // Sin cálculo si no está registrado o no tiene % comisión
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

              {/* Código Vendedor - Solo para admin */}
              {(session?.user as any)?.perfil === 'administrador' && (
                <div>
                  <Label htmlFor="CodVend">Código Vendedor</Label>
                  <Input
                    id="CodVend"
                    value={filters.CodVend}
                    onChange={(e) => setFilters(prev => ({ ...prev, CodVend: e.target.value }))}
                    placeholder="Filtrar por vendedor..."
                  />
                </div>
              )}
            </div>
            
            {/* Botón de limpiar filtros */}
            <div className="mt-4">
              <Button 
                variant="outline"
                onClick={() => {
                  const defaultRange = getCurrentMonthRange();
                  setFilters({
                    CodVend: '',
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
                      <TableHead className="text-right">Total Venta</TableHead>
                      <TableHead className="text-right">Comisión Real</TableHead>
                      <TableHead className="text-center">% Comisión</TableHead>
                      <TableHead className="text-center">Docs. Válidos</TableHead>
                      <TableHead className="text-center">Docs. Pendientes</TableHead>
                      <TableHead className="text-center">% Efectividad</TableHead>
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
