
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PaymentDetailModal } from '@/components/ui/payment-detail-modal';
import { 
  CreditCard, 
  Banknote, 
  FileText,
  Receipt,
  TrendingUp,
  Search,
  Filter,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Loader2,
  Calendar,
  User,
  Hash,
  DollarSign,
  Eye
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PaymentTotalizationCard } from '@/components/ui/payment-totalization-card';

// Interface actualizada para verificación de pagos específica para cierre de caja
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
  targetDocumentType: string; // 'Factura' | 'Boleta'
  hasPaymentVerification: boolean;
  paymentVerificationDate?: Date;
  paymentComment?: string;
  photoUrl?: string;
  paymentMethod?: string;
  amount?: number;
  hasReferences?: boolean;
  isFacturaOrBoleta?: boolean;
  hasNotaCredito?: boolean;
}

interface PaymentVerificationResponse {
  success: boolean;
  documents: PaymentVerificationDocument[];
  statistics: {
    totalDocuments: number;
    documentsWithPayment: number;
    documentsWithoutPayment: number;
    verificationPercentage: number;
    readyForInvoicing: number;
    pendingVerification: number;
  };
  dateRange: {
    from: string;
    appliedFilters: any;
  };
  error?: string;
}

// Interface para filtros dinámicos
interface DynamicFilters {
  FchDoc: string;
  NumDoc: string;
  NomCliente: string;
  CodCli: string;
  CodVend: string;
  MntTotalMin: string;
  MntTotalMax: string;
}

export default function VerificacionPagosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<PaymentVerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ciSession, setCiSession] = useState<string | null>(null);
  const [filteredDocuments, setFilteredDocuments] = useState<PaymentVerificationDocument[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Estados para filtros dinámicos
  const [dynamicFilters, setDynamicFilters] = useState<DynamicFilters>({
    FchDoc: '',
    NumDoc: '',
    NomCliente: '',
    CodCli: '',
    CodVend: '',
    MntTotalMin: '',
    MntTotalMax: '',
  });

  // Generar rango de fechas por defecto (día actual)
  const getCurrentDateRange = () => {
    const now = new Date();
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };
    
    const todayStr = formatDate(now);
    return `${todayStr} a ${todayStr}`;
  };
  
  // Generar rango de fechas por defecto (mes actual)
  const getCurrentMonthRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };
    
    return `${formatDate(startOfMonth)} a ${formatDate(endOfMonth)}`;
  };

  // Estado para las credenciales ERP
  const [erpCredentials, setErpCredentials] = useState<{
    txtrutempresa: string;
    txtusuario: string;
    txtpwd: string;
  } | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/dashboard');
      return;
    }
    
    // Permitir acceso a administradores, vendedores y planificadores
    const user = session.user as any;
    if (user.perfil !== 'administrador' && user.perfil !== 'vendedor' && user.perfil !== 'planificador') {
      router.push('/dashboard');
      return;
    }

    // Establecer filtros por defecto
    const defaultFilters: any = {
      FchDoc: getCurrentMonthRange()
    };
    
    // Si es vendedor o planificador, establecer automáticamente su código
    if ((user.perfil === 'vendedor' || user.perfil === 'planificador') && user.codigoVendedor) {
      defaultFilters.CodVend = user.codigoVendedor;
    }
    
    setDynamicFilters(prev => ({
      ...prev,
      ...defaultFilters
    }));

    // Iniciar autenticación automática
    authenticateERP();
  }, [session, status, router]);

  useEffect(() => {
    if (paymentData?.documents) {
      let filtered = paymentData.documents;

      // Filtrar por estado
      if (statusFilter === 'verified') {
        filtered = filtered.filter(doc => doc.hasPaymentVerification);
      } else if (statusFilter === 'missing') {
        filtered = filtered.filter(doc => !doc.hasPaymentVerification);
      }

      // Si es vendedor o planificador, filtrar solo sus documentos
      const user = session?.user as any;
      if ((user?.perfil === 'vendedor' || user?.perfil === 'planificador') && user?.codigoVendedor) {
        filtered = filtered.filter(doc => 
          doc.CodVend === user.codigoVendedor || 
          doc.Vendedor === user.codigoVendedor
        );
      }

      setFilteredDocuments(filtered);
    }
  }, [paymentData?.documents, statusFilter, session]);

  // Efecto para recargar datos cuando cambien los filtros dinámicos (con debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (ciSession) {
        fetchPaymentVerificationData();
      }
    }, 1000); // Debounce de 1 segundo

    return () => clearTimeout(timeoutId);
  }, [dynamicFilters, ciSession]);

  // Función para autenticar con ERP
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

  const authenticateERP = async () => {
    try {
      setLoading(true);
      setError(null);

      // Siempre obtener las credenciales más recientes
      const credentials = await fetchERPCredentials();
      if (!credentials) {
        throw new Error('No se pudieron obtener las credenciales ERP');
      }

      // Paso 1: Autenticación inicial
      const authResponse = await fetch('/api/erp/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
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
      
      // Cargar datos automáticamente después de autenticar
      await fetchPaymentVerificationData(sessionData.ci_session);
      
    } catch (error) {
      console.error('Error autenticando ERP:', error);
      setError(error instanceof Error ? error.message : 'Error de autenticación');
      toast.error('Error en autenticación ERP');
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener datos de verificación de pagos usando la nueva API
  const fetchPaymentVerificationData = async (sessionId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const sessionToUse = sessionId || ciSession;
      if (!sessionToUse) {
        throw new Error('Sesión ERP no disponible');
      }

      // Construir URL con filtros dinámicos como query parameters
      const params = new URLSearchParams({
        ci_session: sessionToUse,
      });

      // Añadir filtros dinámicos no vacíos
      Object.entries(dynamicFilters).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          params.append(key, value);
        }
      });

      console.log('[PAYMENT VERIFICATION PAGE] Parámetros de búsqueda:', Object.fromEntries(params));

      const response = await fetch(`/api/payment-verification?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al obtener documentos para verificación');
      }

      const data: PaymentVerificationResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error en respuesta del servidor');
      }

      setPaymentData(data);
      toast.success(`Documentos cargados: ${data.statistics.totalDocuments} CT/NV pendientes de facturar`);
      
    } catch (err) {
      console.error('Error cargando datos de verificación:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      toast.error('Error cargando datos de verificación');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(numAmount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL');
  };

  // Función para actualizar filtros dinámicos
  const updateFilter = (key: keyof DynamicFilters, value: string) => {
    setDynamicFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Función para limpiar filtros
  const clearFilters = () => {
    const user = session?.user as any;
    const baseFilters = {
      FchDoc: getCurrentMonthRange(),
      NumDoc: '',
      NomCliente: '',
      CodCli: '',
      CodVend: '',
      MntTotalMin: '',
      MntTotalMax: '',
    };
    
    // Si es vendedor o planificador, mantener su código
    if ((user?.perfil === 'vendedor' || user?.perfil === 'planificador') && user?.codigoVendedor) {
      baseFilters.CodVend = user.codigoVendedor;
    }
    
    setDynamicFilters(baseFilters);
  };

  // Función para manejar verificación de pago individual
  const handleVerifyPayment = async (doc: PaymentVerificationDocument) => {
    const docTypeLabel = doc.TipoDoc === 'CT' ? 'Cotización' : 'Nota de Venta';
    
    // Crear una verificación de pago básica (esto se puede expandir con un modal más completo)
    try {
      // Crear FormData para enviar a la API
      const formData = new FormData();
      formData.append('documentNumber', doc.NumDoc);
      formData.append('documentType', doc.TipoDoc);
      formData.append('paymentMethod', 'transferencia'); // Por defecto, se puede cambiar en un modal
      formData.append('comment', `Verificación para ${docTypeLabel} ${doc.NumDoc} - ${doc.NomCliente}`);
      formData.append('documentInfo', JSON.stringify({
        cliente: doc.NomCliente,
        monto: doc.MntTotal,
        fecha: doc.FchDoc,
        vendedor: doc.CodVend,
        targetType: doc.targetDocumentType
      }));
      
      console.log('[VERIFY PAYMENT] Enviando verificación:', {
        documentNumber: doc.NumDoc,
        documentType: doc.TipoDoc,
        paymentMethod: 'transferencia'
      });

      const response = await fetch('/api/payment-verifications', {
        method: 'POST',
        body: formData, // Enviar FormData sin Content-Type header
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[VERIFY PAYMENT] Verificación exitosa:', result);
        
        toast.success(`Pago verificado para ${docTypeLabel} ${doc.NumDoc}`, {
          description: `Cliente: ${doc.NomCliente} | Monto: ${formatCurrency(doc.MntTotal)} | Generará: ${doc.targetDocumentType}`,
        });
        
        // Recargar datos
        await fetchPaymentVerificationData();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        console.error('[VERIFY PAYMENT] Error del servidor:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('[VERIFY PAYMENT] Error verificando pago:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al verificar pago';
      toast.error(`Error al verificar pago: ${errorMessage}`);
    }
  };



  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Verificación de Pagos - Cierre de Caja</h1>
            <p className="text-muted-foreground">
              {(session?.user as any)?.perfil === 'administrador' 
                ? 'Revisión de documentos CT/NV con verificación de pago para cierre de caja'
                : 'Documentos CT/NV aprobados que requieren verificación de pago antes de facturar'
              }
            </p>
          </div>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>

        {/* Filtros Dinámicos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Dinámicos ERP
            </CardTitle>
            <CardDescription>
              Filtros que modifican directamente el body de la consulta al ERP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fchDoc" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Rango de Fechas (FchDoc)
                </Label>
                <Input
                  id="fchDoc"
                  placeholder="2025-07-01 a 2025-07-31"
                  value={dynamicFilters.FchDoc}
                  onChange={(e) => updateFilter('FchDoc', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Por defecto muestra el mes actual. Cambiar para filtrar por rango específico.
                </p>
              </div>
              <div>
                <Label htmlFor="numDoc" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Número Documento (NumDoc)
                </Label>
                <Input
                  id="numDoc"
                  placeholder="Ej: 12345"
                  value={dynamicFilters.NumDoc}
                  onChange={(e) => updateFilter('NumDoc', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="nomCliente" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente (NomCliente)
                </Label>
                <Input
                  id="nomCliente"
                  placeholder="Nombre del cliente"
                  value={dynamicFilters.NomCliente}
                  onChange={(e) => updateFilter('NomCliente', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="codCli" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Código Cliente (CodCli)
                </Label>
                <Input
                  id="codCli"
                  placeholder="Código cliente"
                  value={dynamicFilters.CodCli}
                  onChange={(e) => updateFilter('CodCli', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="codVend" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Vendedor (CodVend)
                </Label>
                <Input
                  id="codVend"
                  placeholder="Código vendedor"
                  value={dynamicFilters.CodVend}
                  onChange={(e) => updateFilter('CodVend', e.target.value)}
                  disabled={((session?.user as any)?.perfil === 'vendedor' || (session?.user as any)?.perfil === 'planificador')}
                  className={((session?.user as any)?.perfil === 'vendedor' || (session?.user as any)?.perfil === 'planificador') ? 'bg-muted' : ''}
                />
              </div>
              <div>
                <Label htmlFor="mntRange" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Rango Montos
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Mín"
                    value={dynamicFilters.MntTotalMin}
                    onChange={(e) => updateFilter('MntTotalMin', e.target.value)}
                  />
                  <Input
                    placeholder="Máx"
                    value={dynamicFilters.MntTotalMax}
                    onChange={(e) => updateFilter('MntTotalMax', e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            {/* Controles */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${ciSession ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>{ciSession ? 'ERP Conectado' : 'ERP Desconectado'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Auto-actualización activa</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={clearFilters}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Limpiar Filtros
                </Button>
                <Button 
                  onClick={() => fetchPaymentVerificationData()} 
                  disabled={loading || !ciSession} 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {loading ? 'Actualizando...' : 'Actualizar'}
                </Button>
                {!ciSession && (
                  <Button 
                    onClick={authenticateERP} 
                    disabled={loading}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    Reconectar ERP
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {paymentData && (
          <>
            {/* Estadísticas de cierre de caja */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CT/NV Pendientes</CardTitle>
                  <FileText className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {paymentData.statistics.totalDocuments}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Documentos para facturar
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pagos Verificados</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {paymentData.statistics.documentsWithPayment}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Listos para facturar
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sin Verificar</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {paymentData.statistics.documentsWithoutPayment}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pendientes de verificar
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Progreso Cierre</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {paymentData.statistics.verificationPercentage.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Completado
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Totalización por Medio de Pago */}
            <PaymentTotalizationCard 
              documents={filteredDocuments} 
              session={session}
            />

            {/* Grid de documentos para cierre de caja */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Documentos para Verificación de Pago
                </CardTitle>
                <CardDescription>
                  CT/NV aprobados con desglose de factura/boleta (codtipodoc 33/39) - Requieren verificación antes del cierre
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filtro de estado */}
                <div className="flex flex-col md:flex-row gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los Documentos</SelectItem>
                      <SelectItem value="verified">Solo Verificados</SelectItem>
                      <SelectItem value="missing">Solo Pendientes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tabla */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento Origen</TableHead>
                        <TableHead>Generará</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Estado Verificación</TableHead>
                        <TableHead>Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.map((doc, index) => {
                        const docTypeLabel = doc.TipoDoc === 'CT' ? 'Cotización' : 'Nota de Venta';
                        
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span className="font-semibold">{docTypeLabel} {doc.NumDoc}</span>
                                <span className="text-xs text-muted-foreground">{formatDate(doc.FchDoc)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {doc.targetDocumentType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[150px] truncate" title={doc.NomCliente}>
                                {doc.NomCliente}
                              </div>
                            </TableCell>
                            <TableCell>{doc.CodVend || doc.Vendedor}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(doc.MntTotal)}
                            </TableCell>
                            <TableCell>
                              {doc.hasPaymentVerification ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Verificado
                                  </Badge>
                                  {doc.paymentVerificationDate && (
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(doc.paymentVerificationDate.toString())}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Badge variant="destructive">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Pendiente
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {!doc.hasPaymentVerification ? (
                                ((session?.user as any)?.perfil === 'vendedor' || (session?.user as any)?.perfil === 'planificador') ? (
                                  <Button 
                                    size="sm"
                                    onClick={() => handleVerifyPayment(doc)}
                                    className="flex items-center gap-2"
                                  >
                                    <CreditCard className="h-3 w-3" />
                                    Verificar Pago
                                  </Button>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    Solo vendedores pueden verificar
                                  </Badge>
                                )
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="bg-green-50 text-green-700">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Listo para Facturar
                                  </Badge>
                                  <PaymentDetailModal
                                    documentNumber={doc.NumDoc}
                                    documentType={doc.TipoDoc}
                                  >
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex items-center gap-2"
                                    >
                                      <Eye className="h-3 w-3" />
                                      Revisar Pago
                                    </Button>
                                  </PaymentDetailModal>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Información de resultados */}
                {filteredDocuments.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Mostrando {filteredDocuments.length} de {paymentData.documents.length} documentos
                  </div>
                )}

                {filteredDocuments.length === 0 && !loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No se encontraron documentos CT/NV que requieran verificación de pago</p>
                    <p className="text-sm">Ajuste los filtros para ver más resultados</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
