
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, FileText, Search, AlertCircle, Calendar, ChevronDown, Eye, ExternalLink, CameraIcon, ShieldCheck } from 'lucide-react';
import { ERPDocument, DocumentReference } from '@/lib/types';
import { toast } from 'sonner';
import { PaymentVerificationModal } from '@/components/ui/payment-verification-modal';
import { PaymentVerificationGrid } from '@/components/ui/payment-verification-grid';

export default function DocumentosPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<ERPDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ciSession, setCiSession] = useState<string | null>(null);
  
  // Estados para el modal de referencias
  const [referencesModalOpen, setReferencesModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ERPDocument | null>(null);
  
  // Estados para verificación de pagos
  const [paymentVerificationModalOpen, setPaymentVerificationModalOpen] = useState(false);
  const [selectedDocumentForVerification, setSelectedDocumentForVerification] = useState<ERPDocument | null>(null);
  const [verificationRefreshTrigger, setVerificationRefreshTrigger] = useState(0);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalDocuments, setTotalDocuments] = useState(0);

  // Funciones para paginación
  const totalPages = Math.ceil(totalDocuments / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDocuments = documents.slice(startIndex, endIndex);

  // Función para cambiar página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Función para cambiar items por página
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset a primera página
  };

  // Función para resetear paginación cuando cambian filtros
  const resetPagination = () => {
    setCurrentPage(1);
  };
  
  // Generar rango de fechas por defecto (mes actual)
  const getCurrentMonthRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
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
      NumDoc: '',
      NomCliente: '',
      CodCli: '',
      CodVend: '',
      FchDoc: defaultRange.range,
      FchDocStart: defaultRange.startDate,
      FchDocEnd: defaultRange.endDate,
      TipoDoc: 'ALL',
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

  // Efecto para inicializar automáticamente al montar el componente
  useEffect(() => {
    // Autenticación automática al montar
    authenticateERP();
  }, []);

  // Efecto para aplicar filtros cuando cambien (con debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (ciSession) {
        resetPagination(); // Resetear a página 1 cuando cambien filtros
        applyFilters();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters, ciSession]);

  // Credenciales ERP (en un proyecto real, estas deberían estar en variables de entorno)
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

  // Función para cargar documentos
  const loadDocuments = async (sessionId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const sessionToUse = sessionId || ciSession;
      if (!sessionToUse) {
        throw new Error('Sesión ERP no disponible');
      }

      // Preparar filtros para enviar al API
      const filtersToSend = {
        NumDoc: filters.NumDoc,
        NomCliente: filters.NomCliente,
        CodCli: filters.CodCli,
        CodVend: filters.CodVend, // Usar el campo correcto del ERP
        FchDoc: filters.FchDoc,
        TipoDoc: filters.TipoDoc === 'ALL' ? '' : filters.TipoDoc
      };

      console.log('Enviando filtros:', filtersToSend);

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
      setTotalDocuments(docs.length);
      toast.success(`${docs.length} documentos cargados`);
      
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

  // Función para abrir el modal de referencias
  const openReferencesModal = (doc: ERPDocument) => {
    setSelectedDocument(doc);
    setReferencesModalOpen(true);
  };

  // Función para verificar si un documento tiene referencias
  const hasReferences = (doc: ERPDocument): boolean => {
    const references = parseDocumentReferences(doc.Desglose);
    return references.length > 0;
  };

  // Función para verificar si un documento es elegible para verificación de pago
  const isEligibleForPaymentVerification = (doc: ERPDocument): boolean => {
    const user = session?.user as any;
    
    // Solo vendedores pueden verificar pagos
    if (!user || user.perfil !== 'vendedor') return false;
    
    // Solo cotizaciones (CT) y notas de venta (NV) con estado "A"
    const validTypes = ['CT', 'NV'];
    const isValidType = validTypes.includes(doc.TipoDoc || '');
    const isValidState = doc.EstadoDoc === 'A';
    
    return isValidType && isValidState;
  };

  // Función para abrir modal de verificación de pago
  const openPaymentVerificationModal = (doc: ERPDocument) => {
    setSelectedDocumentForVerification(doc);
    setPaymentVerificationModalOpen(true);
  };

  // Función para manejar éxito de verificación
  const handleVerificationSuccess = () => {
    setVerificationRefreshTrigger(prev => prev + 1);
  };

  // Función para formatear moneda
  const formatCurrency = (value: string | number | undefined) => {
    if (!value) return '-';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(numValue);
  };

  // Función para formatear fecha
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-CL');
    } catch {
      return dateStr;
    }
  };

  // Función para obtener el color del badge según el estado
  const getStatusBadgeVariant = (status: string | undefined) => {
    if (!status) return 'secondary';
    switch (status.toLowerCase()) {
      case 'pagado':
      case 'cobrado':
        return 'default';
      case 'pendiente':
        return 'destructive';
      case 'procesando':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documentos ERP</h1>
          <p className="text-muted-foreground">
            Consulta y gestiona los documentos del sistema ERP
          </p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

                {/* Tipo Documento */}
                <div>
                  <Label htmlFor="TipoDoc">Tipo Documento</Label>
                  <Select 
                    value={filters.TipoDoc} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, TipoDoc: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos los tipos</SelectItem>
                      <SelectItem value="CT">Cotización (CT)</SelectItem>
                      <SelectItem value="NV">Nota de Venta (NV)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Código Vendedor - Solo para admin */}
                {(session?.user as any)?.perfil === 'administrador' && (
                  <div>
                    <Label htmlFor="CodVend">Código Vendedor</Label>
                    <Input
                      id="CodVend"
                      value={filters.CodVend}
                      onChange={(e) => setFilters(prev => ({ ...prev, CodVend: e.target.value }))}
                      placeholder="Ej: VEN001"
                    />
                  </div>
                )}
                
                {/* Número de Documento */}
                <div>
                  <Label htmlFor="NumDoc">Número Documento</Label>
                  <Input
                    id="NumDoc"
                    value={filters.NumDoc}
                    onChange={(e) => setFilters(prev => ({ ...prev, NumDoc: e.target.value }))}
                    placeholder="Ej: 12345"
                  />
                </div>
                
                {/* Nombre Cliente */}
                <div>
                  <Label htmlFor="NomCliente">Nombre Cliente</Label>
                  <Input
                    id="NomCliente"
                    value={filters.NomCliente}
                    onChange={(e) => setFilters(prev => ({ ...prev, NomCliente: e.target.value }))}
                    placeholder="Buscar cliente..."
                  />
                </div>

                {/* Código Cliente */}
                <div>
                  <Label htmlFor="CodCli">Código Cliente</Label>
                  <Input
                    id="CodCli"
                    value={filters.CodCli}
                    onChange={(e) => setFilters(prev => ({ ...prev, CodCli: e.target.value }))}
                    placeholder="Código..."
                  />
                </div>
              </div>
              
              {/* Botón de limpiar filtros */}
              <div className="mt-4">
                <Button 
                  variant="outline"
                  onClick={() => {
                    const defaultRange = getCurrentMonthRange();
                    setFilters({
                      NumDoc: '',
                      NomCliente: '',
                      CodCli: '',
                      CodVend: '',
                      FchDoc: defaultRange.range,
                      FchDocStart: defaultRange.startDate,
                      FchDocEnd: defaultRange.endDate,
                      TipoDoc: 'ALL',
                    });
                    resetPagination(); // Resetear paginación al limpiar filtros
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

        {/* Tabla de documentos */}
        <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Documentos</CardTitle>
                  <CardDescription>
                    {totalDocuments > 0 ? (
                      <>
                        Mostrando {startIndex + 1} - {Math.min(endIndex, totalDocuments)} de {totalDocuments} documento(s)
                      </>
                    ) : (
                      'No se encontraron documentos'
                    )}
                  </CardDescription>
                </div>
                {totalDocuments > 0 && (
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
                  <span className="ml-2">Cargando documentos...</span>
                </div>
              ) : totalDocuments === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron documentos
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>RUT Cliente</TableHead>
                        <TableHead>Monto Neto</TableHead>
                        <TableHead>Monto Total</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Referencias</TableHead>
                        <TableHead>Verificar Pago</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentDocuments.map((doc, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{doc.NumDoc || '-'}</TableCell>
                          <TableCell>{doc.TipoDoc || '-'}</TableCell>
                          <TableCell>{formatDate(doc.FchDoc)}</TableCell>
                          <TableCell>{doc.NomCliente || '-'}</TableCell>
                          <TableCell>{doc.RutCli || '-'}</TableCell>
                          <TableCell>{formatCurrency(doc.MntNeto)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(doc.MntTotal)}</TableCell>
                          <TableCell>{doc.Vendedor || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(doc.EstadoProcesoDoc)}>
                              {doc.EstadoProcesoDoc || 'Sin estado'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {hasReferences(doc) ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openReferencesModal(doc)}
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                Ver Referencias
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">Sin referencias</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isEligibleForPaymentVerification(doc) ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPaymentVerificationModal(doc)}
                                className="flex items-center gap-2"
                              >
                                <CameraIcon className="h-4 w-4" />
                                Verificar Pago
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                {(session?.user as any)?.perfil === 'vendedor' 
                                  ? 'No elegible' 
                                  : 'Solo vendedores'
                                }
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {/* Paginación */}
              {totalDocuments > itemsPerPage && (
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

        {/* Modal de Referencias */}
        <Dialog open={referencesModalOpen} onOpenChange={setReferencesModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Referencias del Documento
              </DialogTitle>
              <DialogDescription>
                {selectedDocument ? (
                  <>
                    Documento {selectedDocument.TipoDoc} #{selectedDocument.NumDoc} - {selectedDocument.NomCliente}
                  </>
                ) : (
                  'Información de referencias del documento'
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedDocument ? (
                (() => {
                  const references = parseDocumentReferences(selectedDocument.Desglose);
                  
                  if (references.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No se encontraron referencias para este documento</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="mb-4">
                        <Badge variant="outline" className="text-sm">
                          {references.length} referencia(s) encontrada(s)
                        </Badge>
                      </div>
                      
                      <div className="grid gap-4">
                        {references.map((ref, index) => (
                          <Card key={index} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 pb-2 border-b">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">Referencia {index + 1}</span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Mostrar todos los campos tal como vienen del JSON */}
                                {Object.entries(ref)
                                  .filter(([key, value]) => 
                                    value !== null && 
                                    value !== undefined && 
                                    value !== '' &&
                                    String(value).trim() !== ''
                                  )
                                  .map(([key, value]) => (
                                    <div key={key}>
                                      <Label className="text-sm font-medium text-muted-foreground capitalize">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                      </Label>
                                      <p className="text-sm mt-1 break-words">
                                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                      </p>
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay documento seleccionado</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Verificación de Pago */}
        <PaymentVerificationModal
          open={paymentVerificationModalOpen}
          onOpenChange={setPaymentVerificationModalOpen}
          document={selectedDocumentForVerification}
          onSuccess={handleVerificationSuccess}
        />

        {/* Grid de Verificaciones de Pago */}
        {(session?.user as any)?.perfil === 'vendedor' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Mis Verificaciones de Pago
              </CardTitle>
              <CardDescription>
                Historial de verificaciones de pago realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentVerificationGrid
                refreshTrigger={verificationRefreshTrigger}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
