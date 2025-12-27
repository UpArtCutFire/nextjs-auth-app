'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PaymentApprovalModal } from '@/components/ui/payment-approval-modal';
import { PaymentDetailModal } from '@/components/ui/payment-detail-modal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  CreditCard, 
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Calendar,
  User,
  DollarSign,
  Eye,
  FileText,
  Banknote,
  Smartphone,
  Hash,
  Edit,
  Trash2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface PaymentVerification {
  id: string;
  documentNumber: string;
  documentType: string;
  vendorCode: string;
  photoUrl?: string;
  comment: string;
  documentInfo: string;
  paymentMethod: string;
  amount?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    nombre: string;
    codigo_vendedor?: string;
    perfil: string;
  };
  approver?: {
    id: string;
    nombre: string;
  };
}

export default function AdminVerificacionesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState<PaymentVerification[]>([]);
  const [filteredVerifications, setFilteredVerifications] = useState<PaymentVerification[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');

  // Filtro de mes/año (-1 significa "todos")
  const [selectedMonth, setSelectedMonth] = useState<number>(-1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Nombres de meses
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Generar array de años (últimos 3 años)
  const availableYears = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  // Estados para edición y eliminación
  const [editingVerification, setEditingVerification] = useState<PaymentVerification | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
    approvedAmount: 0,
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.perfil !== 'administrador') {
      router.push('/dashboard');
      return;
    }

    fetchVerifications();
  }, [session, status, router]);

  useEffect(() => {
    applyFilters();
    calculateStats();
  }, [verifications, searchTerm, statusFilter, paymentMethodFilter, vendorFilter, selectedMonth, selectedYear]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/payment-verifications');
      if (!response.ok) {
        throw new Error('Error al obtener verificaciones');
      }

      const data = await response.json();
      if (data.success) {
        setVerifications(data.verifications);
      } else {
        throw new Error(data.error || 'Error al cargar datos');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      toast.error('Error al cargar verificaciones');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...verifications];

    // Filtro por mes/año (solo si no es "todos")
    if (selectedMonth !== -1) {
      filtered = filtered.filter(v => {
        const date = new Date(v.createdAt);
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
      });
    }

    // Búsqueda por texto
    if (searchTerm) {
      filtered = filtered.filter(v =>
        v.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.comment.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    // Filtro por método de pago
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(v => v.paymentMethod === paymentMethodFilter);
    }

    // Filtro por vendedor
    if (vendorFilter !== 'all') {
      filtered = filtered.filter(v => v.user.id === vendorFilter);
    }

    // Ordenar por prioridad: pendientes primero, luego por fecha
    filtered = [...filtered].sort((a, b) => {
      // Primero: pendientes antes que otros estados
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      // Segundo: ordenar por fecha más reciente
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setFilteredVerifications(filtered);
  };

  const calculateStats = () => {
    // Filtrar por mes/año para las estadísticas (solo si no es "todos")
    const monthFilteredVerifications = selectedMonth === -1
      ? verifications
      : verifications.filter(v => {
          const date = new Date(v.createdAt);
          return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
        });

    const stats = monthFilteredVerifications.reduce((acc, v) => {
      acc.total++;

      // Type-safe status counting
      const status = v.status.toLowerCase();
      if (status === 'pending') acc.pending++;
      else if (status === 'approved') acc.approved++;
      else if (status === 'rejected') acc.rejected++;

      if (v.amount) {
        acc.totalAmount += v.amount;
        if (v.status === 'APPROVED') {
          acc.approvedAmount += v.amount;
        }
      }

      return acc;
    }, {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      totalAmount: 0,
      approvedAmount: 0,
    });

    setStats(stats);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprobado
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rechazado
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'efectivo':
        return <Banknote className="h-4 w-4" />;
      case 'transferencia':
        return <CreditCard className="h-4 w-4" />;
      case 'webpay':
        return <Smartphone className="h-4 w-4" />;
      case 'flete':
        return <span className="text-base">🚚</span>;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'efectivo':
        return 'Efectivo';
      case 'transferencia':
        return 'Transferencia';
      case 'webpay':
        return 'Webpay';
      case 'flete':
        return 'Monto Flete';
      default:
        return method;
    }
  };

  // Funciones para editar y eliminar
  const handleEditStatus = async (newStatus: 'APPROVED' | 'REJECTED', rejectionReason?: string) => {
    if (!editingVerification) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/payment-verifications/${editingVerification.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          rejectionReason: newStatus === 'REJECTED' ? rejectionReason : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Verificación ${newStatus === 'APPROVED' ? 'aprobada' : 'rechazada'} exitosamente`);
        setEditingVerification(null);
        fetchVerifications();
      } else {
        toast.error(data.error || 'Error al actualizar verificación');
      }
    } catch (error) {
      console.error('Error updating verification:', error);
      toast.error('Error al actualizar verificación');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (verificationId: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/payment-verifications/${verificationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Verificación eliminada exitosamente');
        setDeleteConfirmId(null);
        fetchVerifications();
      } else {
        toast.error(data.error || 'Error al eliminar verificación');
      }
    } catch (error) {
      console.error('Error deleting verification:', error);
      toast.error('Error al eliminar verificación');
    } finally {
      setActionLoading(false);
    }
  };

  // Obtener lista única de vendedores
  const uniqueVendors = Array.from(new Set(verifications.map(v => v.user.id)))
    .map(id => {
      const user = verifications.find(v => v.user.id === id)?.user;
      return user ? { id: user.id, nombre: user.nombre } : null;
    })
    .filter(Boolean) as { id: string; nombre: string }[];

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
            <h1 className="text-3xl font-bold">Gestión de Verificaciones de Pago</h1>
            <p className="text-muted-foreground">
              Apruebe o rechace las verificaciones de pago enviadas por los vendedores
            </p>
          </div>
          <Button
            onClick={fetchVerifications}
            variant="outline"
            className="flex items-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualizar
          </Button>
        </div>

        {/* Selector de Mes/Año */}
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-yellow-600" />
                <span className="font-semibold text-yellow-800">Período de Consulta:</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="month-select" className="text-sm text-yellow-700">Mes:</Label>
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(value) => setSelectedMonth(parseInt(value))}
                  >
                    <SelectTrigger id="month-select" className="w-[140px] bg-white border-yellow-300">
                      <SelectValue placeholder="Seleccionar mes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">Todos</SelectItem>
                      {monthNames.map((name, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedMonth !== -1 && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="year-select" className="text-sm text-yellow-700">Año:</Label>
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(value) => setSelectedYear(parseInt(value))}
                    >
                      <SelectTrigger id="year-select" className="w-[100px] bg-white border-yellow-300">
                        <SelectValue placeholder="Año" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Badge className="bg-yellow-500 text-white ml-2">
                  {selectedMonth === -1 ? 'Todos los períodos' : `${monthNames[selectedMonth]} ${selectedYear}`}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Verificaciones</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Por revisar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <p className="text-xs text-muted-foreground">Confirmadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground">No válidas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.totalAmount)}
              </div>
              <p className="text-xs text-muted-foreground">En verificaciones</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monto Aprobado</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.approvedAmount)}
              </div>
              <p className="text-xs text-muted-foreground">Confirmado</p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por número, vendedor o comentario..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="PENDING">Pendientes</SelectItem>
                  <SelectItem value="APPROVED">Aprobadas</SelectItem>
                  <SelectItem value="REJECTED">Rechazadas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Método de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los métodos</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="webpay">Webpay</SelectItem>
                  <SelectItem value="flete">Monto Flete</SelectItem>
                </SelectContent>
              </Select>

              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los vendedores</SelectItem>
                  {uniqueVendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de verificaciones */}
        <Card>
          <CardHeader>
            <CardTitle>Verificaciones de Pago</CardTitle>
            <CardDescription>
              Lista completa de verificaciones enviadas por los vendedores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVerifications.map((verification) => (
                    <TableRow key={verification.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {verification.documentType === 'CT' ? 'Cotización' : 'Nota de Venta'} {verification.documentNumber}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {verification.vendorCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{verification.user.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(verification.paymentMethod)}
                          <span>{getPaymentMethodLabel(verification.paymentMethod)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {verification.amount ? formatCurrency(verification.amount) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{formatDate(verification.createdAt)}</span>
                          {verification.approvedAt && (
                            <span className="text-xs text-muted-foreground">
                              Procesado: {formatDate(verification.approvedAt)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(verification.status)}
                          {verification.approver && (
                            <span className="text-xs text-muted-foreground">
                              Por: {verification.approver.nombre}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {verification.status === 'PENDING' ? (
                            <PaymentApprovalModal
                              verificationId={verification.id}
                              documentNumber={verification.documentNumber}
                              documentType={verification.documentType}
                              amount={verification.amount}
                              paymentMethod={verification.paymentMethod}
                              photoUrl={verification.photoUrl}
                              comment={verification.comment}
                              vendorName={verification.user.nombre}
                              createdAt={verification.createdAt}
                              status={verification.status}
                              onStatusChange={fetchVerifications}
                            >
                              <Button size="sm" className="flex items-center gap-2">
                                <AlertCircle className="h-3 w-3" />
                                Revisar
                              </Button>
                            </PaymentApprovalModal>
                          ) : (
                            <>
                              <PaymentDetailModal
                                documentNumber={verification.documentNumber}
                                documentType={verification.documentType}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-2"
                                >
                                  <Eye className="h-3 w-3" />
                                  Ver
                                </Button>
                              </PaymentDetailModal>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                                onClick={() => setEditingVerification(verification)}
                                disabled={actionLoading}
                              >
                                <Edit className="h-3 w-3" />
                                Editar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="flex items-center gap-2"
                                onClick={() => setDeleteConfirmId(verification.id)}
                                disabled={actionLoading}
                              >
                                <Trash2 className="h-3 w-3" />
                                Eliminar
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredVerifications.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron verificaciones</p>
                <p className="text-sm">Ajuste los filtros para ver más resultados</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de edición de estado */}
        <Dialog open={!!editingVerification} onOpenChange={() => setEditingVerification(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Estado de Verificación</DialogTitle>
              <DialogDescription>
                Cambiar el estado de aprobación para {editingVerification?.documentType} #{editingVerification?.documentNumber}
              </DialogDescription>
            </DialogHeader>
            <EditStatusForm 
              verification={editingVerification}
              onSave={handleEditStatus}
              loading={actionLoading}
            />
          </DialogContent>
        </Dialog>

        {/* Modal de confirmación de eliminación */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar verificación?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente la verificación de pago y no se puede deshacer.
                El vendedor podrá crear una nueva verificación si es necesario.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                disabled={actionLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Eliminando...
                  </>
                ) : (
                  'Eliminar'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

// Componente para el formulario de edición de estado
function EditStatusForm({ 
  verification, 
  onSave, 
  loading 
}: { 
  verification: PaymentVerification | null;
  onSave: (status: 'APPROVED' | 'REJECTED', reason?: string) => void;
  loading: boolean;
}) {
  const [newStatus, setNewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState('');

  if (!verification) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatus === 'REJECTED' && !rejectionReason.trim()) {
      toast.error('El motivo de rechazo es obligatorio');
      return;
    }
    onSave(newStatus, rejectionReason);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nuevo Estado</Label>
        <Select value={newStatus} onValueChange={(value: 'APPROVED' | 'REJECTED') => setNewStatus(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="APPROVED">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Aprobar
              </div>
            </SelectItem>
            <SelectItem value="REJECTED">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Rechazar
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {newStatus === 'REJECTED' && (
        <div className="space-y-2">
          <Label htmlFor="rejectionReason">Motivo del Rechazo *</Label>
          <Textarea
            id="rejectionReason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explique por qué se rechaza esta verificación..."
            rows={3}
            disabled={loading}
          />
        </div>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => {}}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            'Guardar Cambios'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}