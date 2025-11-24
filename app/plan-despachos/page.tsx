'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, Truck, RotateCcw, PlayCircle, CheckCircle2, XCircle, Camera, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { PlanningModal } from '@/components/ui/planning-modal';

interface Dispatch {
  id: string;
  documentNumber: string;
  documentType: string;
  vendorCode: string;
  direccion: string;
  comuna: string;
  region: string;
  telefono?: string;
  correo?: string;
  tamanoDespacho: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  clienteNombre: string;
  status: 'PENDING' | 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  scheduledDate?: string;
  scheduledPeriod?: string;
  startedAt?: string;
  completedAt?: string;
  driverId?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    nombre: string;
    correo: string;
  };
  transport?: {
    id: string;
    patente: string;
    nombre: string;
    talla: 'S' | 'M' | 'L' | 'XL';
    activo: boolean;
    totalCapacity: number;
  };
  deliveryPhotos: Array<{
    id: string;
    photoUrl: string;
    comment?: string;
    createdAt: string;
  }>;
}

export default function PlanDespachos() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanningModal, setShowPlanningModal] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [selectedPhotosDispatch, setSelectedPhotosDispatch] = useState<Dispatch | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    // Verificar que solo administradores y planificadores puedan acceder
    const userProfile = (session.user as any)?.perfil;
    const canPlan = userProfile === 'administrador' || 
                   userProfile === 'planificador' ||
                   session.user?.email === 'john@doe.com' || 
                   session.user?.email === 'admin@test.com';
    
    if (!canPlan) {
      router.push('/dashboard');
      return;
    }

    fetchDispatches();
  }, [session, status, router]);

  const fetchDispatches = async () => {
    try {
      const response = await fetch('/api/dispatches/list');
      if (response.ok) {
        const data = await response.json();
        setDispatches(data);
      } else {
        throw new Error('Error al cargar despachos');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar los despachos');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanDispatch = (dispatch: Dispatch) => {
    setSelectedDispatch(dispatch);
    setShowPlanningModal(true);
  };

  const handleClosePlanningModal = () => {
    setShowPlanningModal(false);
    setSelectedDispatch(null);
  };

  const handlePlanningSuccess = () => {
    handleClosePlanningModal();
    fetchDispatches();
  };

  const handleResetDispatch = async (dispatch: Dispatch) => {
    try {
      const response = await fetch('/api/dispatches/reset', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: dispatch.id }),
      });

      if (response.ok) {
        toast.success('Despacho reiniciado exitosamente');
        fetchDispatches();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al reiniciar despacho');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al reiniciar despacho');
    }
  };

  const handleUpdateStatus = async (dispatch: Dispatch, newStatus: string, driverId?: string) => {
    try {
      const response = await fetch('/api/dispatches/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: dispatch.id, 
          status: newStatus,
          driverId 
        }),
      });

      if (response.ok) {
        const statusNames = {
          'IN_TRANSIT': 'en tránsito',
          'DELIVERED': 'entregado',
          'CANCELLED': 'cancelado'
        };
        toast.success(`Despacho marcado como ${statusNames[newStatus as keyof typeof statusNames]}`);
        fetchDispatches();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al actualizar estado');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const handleViewPhotos = (dispatch: Dispatch) => {
    setSelectedPhotosDispatch(dispatch);
    setShowPhotosModal(true);
  };

  const handleClosePhotosModal = () => {
    setShowPhotosModal(false);
    setSelectedPhotosDispatch(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Pendiente</Badge>;
      case 'SCHEDULED':
        return <Badge variant="default" className="bg-blue-500 text-white">Programado</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="default" className="bg-orange-500 text-white">En Tránsito</Badge>;
      case 'DELIVERED':
        return <Badge variant="default" className="bg-green-500 text-white">Entregado</Badge>;
      case 'CANCELLED':
        return <Badge variant="default" className="bg-red-500 text-white">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSizeBadge = (size: string) => {
    const colors = {
      S: 'bg-blue-500',
      M: 'bg-green-500',
      L: 'bg-yellow-500',
      XL: 'bg-red-500',
      XXL: 'bg-purple-500'
    };
    return <Badge className={colors[size as keyof typeof colors] || 'bg-gray-500'}>{size}</Badge>;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    // Usar la fecha directamente sin manipulación para evitar problemas de timezone
    const date = new Date(dateString);
    // Formatear usando la fecha local
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Cargando despachos...</p>
        </div>
      </div>
    );
  }

  const filteredDispatches = dispatches.filter(dispatch => dispatch.status === activeTab);
  
  const getTabCount = (status: string) => {
    return dispatches.filter(dispatch => dispatch.status === status).length;
  };

  const renderDispatchTable = (statusDispatches: Dispatch[]) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Documento</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Dirección</TableHead>
            <TableHead>Comuna</TableHead>
            <TableHead>Tamaño</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha Programada</TableHead>
            <TableHead>Horario</TableHead>
            <TableHead>Transporte</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {statusDispatches.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                No hay despachos en este estado
              </TableCell>
            </TableRow>
          ) : (
            statusDispatches.map((dispatch) => (
              <TableRow key={dispatch.id}>
                <TableCell className="font-medium">
                  {dispatch.documentType} {dispatch.documentNumber}
                </TableCell>
                <TableCell>{dispatch.clienteNombre}</TableCell>
                <TableCell>{dispatch.direccion || 'N/A'}</TableCell>
                <TableCell>{dispatch.comuna || 'N/A'}</TableCell>
                <TableCell>{getSizeBadge(dispatch.tamanoDespacho)}</TableCell>
                <TableCell>{getStatusBadge(dispatch.status)}</TableCell>
                <TableCell>{formatDate(dispatch.scheduledDate)}</TableCell>
                <TableCell>
                  {dispatch.scheduledPeriod ? (
                    <Badge variant="outline">{dispatch.scheduledPeriod}</Badge>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {dispatch.transport ? (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{dispatch.transport.patente}</span>
                      <Badge className={
                        dispatch.transport.talla === 'S' ? 'bg-blue-500' :
                        dispatch.transport.talla === 'M' ? 'bg-green-500' :
                        dispatch.transport.talla === 'L' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }>
                        {dispatch.transport.talla}
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Sin asignar</span>
                  )}
                </TableCell>
                <TableCell>{dispatch.user.nombre}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    {/* Botones según el estado */}
                    {dispatch.status === 'PENDING' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handlePlanDispatch(dispatch)}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Planificar
                      </Button>
                    )}
                    
                    {dispatch.status === 'SCHEDULED' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePlanDispatch(dispatch)}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Reprogramar
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleResetDispatch(dispatch)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Reiniciar
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleUpdateStatus(dispatch, 'IN_TRANSIT', session?.user?.id)}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Iniciar
                        </Button>
                      </>
                    )}
                    
                    {dispatch.status === 'IN_TRANSIT' && (
                      <div className="text-xs text-gray-500 italic text-center py-2">
                        Solo el despachador puede completar la entrega desde su panel
                      </div>
                    )}
                    
                    {dispatch.status === 'DELIVERED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPhotos(dispatch)}
                        className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                      >
                        <Camera className="h-4 w-4 mr-1" />
                        Ver Fotos ({dispatch.deliveryPhotos?.length || 0})
                      </Button>
                    )}
                    
                    {(dispatch.status === 'SCHEDULED' || dispatch.status === 'IN_TRANSIT') && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleUpdateStatus(dispatch, 'CANCELLED')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-6 w-6" />
              <CardTitle>Plan de Despachos</CardTitle>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {dispatches.length} despachos
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="PENDING" className="flex items-center gap-2">
                  <span>Pendientes</span>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                    {getTabCount('PENDING')}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="SCHEDULED" className="flex items-center gap-2">
                  <span>Programados</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {getTabCount('SCHEDULED')}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="IN_TRANSIT" className="flex items-center gap-2">
                  <span>En Tránsito</span>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    {getTabCount('IN_TRANSIT')}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="DELIVERED" className="flex items-center gap-2">
                  <span>Entregados</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {getTabCount('DELIVERED')}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="CANCELLED" className="flex items-center gap-2">
                  <span>Cancelados</span>
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    {getTabCount('CANCELLED')}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="PENDING" className="mt-6">
                {renderDispatchTable(filteredDispatches)}
              </TabsContent>
              
              <TabsContent value="SCHEDULED" className="mt-6">
                {renderDispatchTable(filteredDispatches)}
              </TabsContent>
              
              <TabsContent value="IN_TRANSIT" className="mt-6">
                {renderDispatchTable(filteredDispatches)}
              </TabsContent>
              
              <TabsContent value="DELIVERED" className="mt-6">
                {renderDispatchTable(filteredDispatches)}
              </TabsContent>
              
              <TabsContent value="CANCELLED" className="mt-6">
                {renderDispatchTable(filteredDispatches)}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {showPlanningModal && selectedDispatch && (
          <PlanningModal
            dispatch={selectedDispatch}
            onClose={handleClosePlanningModal}
            onSuccess={handlePlanningSuccess}
          />
        )}

        {/* Modal de Fotos */}
        <Dialog open={showPhotosModal} onOpenChange={setShowPhotosModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Evidencia de Entrega
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClosePhotosModal}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            
            {selectedPhotosDispatch && (
              <div className="space-y-6">
                {/* Información del Despacho */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          {selectedPhotosDispatch.documentType} {selectedPhotosDispatch.documentNumber}
                        </Badge>
                        {getStatusBadge(selectedPhotosDispatch.status)}
                      </div>
                      <h3 className="font-semibold text-lg mb-1">
                        {selectedPhotosDispatch.clienteNombre}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {selectedPhotosDispatch.direccion}, {selectedPhotosDispatch.comuna}, {selectedPhotosDispatch.region}
                      </p>
                      {selectedPhotosDispatch.telefono && (
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Tel: {selectedPhotosDispatch.telefono}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {selectedPhotosDispatch.completedAt && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>Entregado: {new Date(selectedPhotosDispatch.completedAt).toLocaleString('es-CL')}</span>
                        </div>
                      )}
                      {selectedPhotosDispatch.transport && (
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-500" />
                          <span>Transporte: {selectedPhotosDispatch.transport.patente}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-gray-500" />
                        <span>{selectedPhotosDispatch.deliveryPhotos?.length || 0} foto(s) de evidencia</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fotos de Evidencia */}
                {selectedPhotosDispatch.deliveryPhotos && selectedPhotosDispatch.deliveryPhotos.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Fotos de Evidencia
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedPhotosDispatch.deliveryPhotos.map((photo, index) => (
                        <div key={photo.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                          <div className="aspect-square relative">
                            <img
                              src={photo.photoUrl}
                              alt={`Evidencia ${index + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(photo.photoUrl, '_blank')}
                            />
                            <div className="absolute top-2 right-2">
                              <Badge variant="secondary" className="bg-black/50 text-white text-xs">
                                {index + 1}
                              </Badge>
                            </div>
                          </div>
                          <div className="p-3">
                            <div className="text-xs text-gray-500 mb-1">
                              {new Date(photo.createdAt).toLocaleString('es-CL')}
                            </div>
                            {photo.comment && (
                              <div className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                                <strong>Comentario:</strong> {photo.comment}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      No hay fotos de evidencia
                    </h3>
                    <p className="text-gray-500">
                      Este despacho no tiene fotos de evidencia adjuntas
                    </p>
                  </div>
                )}

                {/* Botón para cerrar */}
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleClosePhotosModal} variant="outline">
                    Cerrar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}