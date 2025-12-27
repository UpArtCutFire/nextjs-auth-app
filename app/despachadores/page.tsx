'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSession } from 'next-auth/react';
import { 
  Truck, 
  MapPin, 
  Phone, 
  FileText, 
  Package, 
  Play, 
  CheckCircle, 
  Camera,
  Upload,
  RefreshCw,
  Clock,
  User
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

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
    talla: string;
  };
  deliveryPhotos: Array<{
    id: string;
    photoUrl: string;
    comment?: string;
    createdAt: string;
  }>;
}

interface Transport {
  id: string;
  patente: string;
  nombre: string;
  talla: string;
  activo: boolean;
}

export default function DespachadorPage() {
  const { data: session } = useSession();
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [selectedTransport, setSelectedTransport] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Modal states
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoComment, setPhotoComment] = useState('');

  useEffect(() => {
    fetchTransports();
    fetchDispatches();
  }, [selectedTransport]);

  const fetchTransports = async () => {
    try {
      const response = await fetch('/api/transports');
      if (response.ok) {
        const data = await response.json();
        setTransports(data.filter((t: Transport) => t.activo));
      }
    } catch (error) {
      console.error('Error al cargar transportes:', error);
    }
  };

  const fetchDispatches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedTransport) {
        params.append('transportId', selectedTransport);
      }
      
      const response = await fetch(`/api/dispatches/driver?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDispatches(data);
      }
    } catch (error) {
      console.error('Error al cargar despachos:', error);
    } finally {
      setLoading(false);
    }
  };

  const startDispatch = async (dispatchId: string) => {
    try {
      setActionLoading(dispatchId);
      const response = await fetch(`/api/dispatches/${dispatchId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId: session?.user?.id
        }),
      });

      if (response.ok) {
        toast.success('Despacho iniciado correctamente');
        fetchDispatches();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al iniciar despacho');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al iniciar despacho');
    } finally {
      setActionLoading(null);
    }
  };

  const openPhotoModal = (dispatch: Dispatch) => {
    setSelectedDispatch(dispatch);
    setPhotoModalOpen(true);
    setPhotos([]);
    setPhotoPreviews([]);
    setPhotoComment('');
  };

  // Manejar selección de fotos con validación
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: File[] = [];
    const newPreviews: string[] = [];
    const maxSize = 5 * 1024 * 1024; // 5MB por foto (igual que payment-verifications)

    Array.from(files).forEach((file) => {
      // Validar que sea imagen
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} no es una imagen válida`);
        return;
      }

      // Validar tamaño
      if (file.size > maxSize) {
        toast.error(`${file.name} excede el límite de 5MB`);
        return;
      }

      newPhotos.push(file);

      // Crear preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotoPreviews(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    setPhotos(prev => [...prev, ...newPhotos]);

    // Limpiar input para permitir seleccionar la misma foto de nuevo
    e.target.value = '';
  };

  // Eliminar foto individual
  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = async () => {
    if (!selectedDispatch || photos.length === 0) {
      toast.error('Debe seleccionar al menos una foto');
      return;
    }

    try {
      setActionLoading(selectedDispatch.id);
      const formData = new FormData();

      // Agregar todas las fotos validadas
      photos.forEach((file, index) => {
        formData.append(`photo${index}`, file);
      });

      formData.append('comment', photoComment);
      formData.append('dispatchId', selectedDispatch.id);
      formData.append('driverId', session?.user?.id || '');

      const response = await fetch('/api/dispatches/complete', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success('Despacho completado correctamente');
        setPhotoModalOpen(false);
        setPhotos([]);
        setPhotoPreviews([]);
        fetchDispatches();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || errorData.message || `Error del servidor (${response.status})`;
        console.error('Error response:', response.status, errorData);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error en fetch:', error);
      toast.error('Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: 'bg-gray-500', text: 'Pendiente' },
      SCHEDULED: { color: 'bg-blue-500', text: 'Programado' },
      IN_TRANSIT: { color: 'bg-orange-500', text: 'En Tránsito' },
      DELIVERED: { color: 'bg-green-500', text: 'Entregado' },
      CANCELLED: { color: 'bg-red-500', text: 'Cancelado' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-500', text: status };
    return <Badge className={config.color}>{config.text}</Badge>;
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

  // Filtrar despachos por estado
  const scheduledDispatches = dispatches.filter(d => d.status === 'SCHEDULED');
  const inTransitDispatches = dispatches.filter(d => d.status === 'IN_TRANSIT');
  const deliveredDispatches = dispatches.filter(d => d.status === 'DELIVERED');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando despachos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-600 rounded-lg p-3">
              <Truck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Panel de Despachador</h1>
              <p className="text-gray-500">Gestiona tus entregas y despachos</p>
            </div>
          </div>

          {/* Filtro por Transporte */}
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seleccionar Camión
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedTransport}
                onChange={(e) => setSelectedTransport(e.target.value)}
              >
                <option value="">Todos los camiones</option>
                {transports.map((transport) => (
                  <option key={transport.id} value={transport.id}>
                    {transport.patente} - {transport.nombre} ({transport.talla})
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={fetchDispatches}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 mt-6"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Programados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Programados
                <Badge variant="outline">{scheduledDispatches.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {scheduledDispatches.map((dispatch) => (
                <div key={dispatch.id} className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-sm">
                        {dispatch.documentType} {dispatch.documentNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getSizeBadge(dispatch.tamanoDespacho)}
                      {getStatusBadge(dispatch.status)}
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1 mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="font-medium">{dispatch.direccion}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {dispatch.comuna}, {dispatch.region}
                    </div>
                    {dispatch.telefono && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span className="font-medium">{dispatch.telefono}</span>
                      </div>
                    )}
                    {dispatch.transport && (
                      <div className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        <span className="font-medium">{dispatch.transport.patente}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => startDispatch(dispatch.id)}
                    disabled={actionLoading === dispatch.id}
                    className="w-full"
                    size="sm"
                  >
                    {actionLoading === dispatch.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Iniciar Despacho
                  </Button>
                </div>
              ))}

              {scheduledDispatches.length === 0 && (
                <p className="text-center text-gray-500 py-8">No hay despachos programados</p>
              )}
            </CardContent>
          </Card>

          {/* En Tránsito */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-orange-600" />
                En Tránsito
                <Badge variant="outline">{inTransitDispatches.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {inTransitDispatches.map((dispatch) => (
                <div key={dispatch.id} className="border rounded-lg p-4 bg-orange-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-orange-600" />
                      <span className="font-semibold text-sm">
                        {dispatch.documentType} {dispatch.documentNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getSizeBadge(dispatch.tamanoDespacho)}
                      {getStatusBadge(dispatch.status)}
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1 mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="font-medium">{dispatch.direccion}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {dispatch.comuna}, {dispatch.region}
                    </div>
                    {dispatch.telefono && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span className="font-medium">{dispatch.telefono}</span>
                      </div>
                    )}
                    {dispatch.startedAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Iniciado: {new Date(dispatch.startedAt).toLocaleString('es-CL')}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => openPhotoModal(dispatch)}
                    disabled={actionLoading === dispatch.id}
                    className="w-full"
                    size="sm"
                    variant="outline"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Completar Entrega
                  </Button>
                </div>
              ))}

              {inTransitDispatches.length === 0 && (
                <p className="text-center text-gray-500 py-8">No hay despachos en tránsito</p>
              )}
            </CardContent>
          </Card>

          {/* Entregados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Entregados Hoy
                <Badge variant="outline">{deliveredDispatches.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {deliveredDispatches.map((dispatch) => (
                <div key={dispatch.id} className="border rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-sm">
                        {dispatch.documentType} {dispatch.documentNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getSizeBadge(dispatch.tamanoDespacho)}
                      {getStatusBadge(dispatch.status)}
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="font-medium">{dispatch.direccion}</span>
                    </div>
                    {dispatch.completedAt && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Entregado: {new Date(dispatch.completedAt).toLocaleString('es-CL')}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      {dispatch.deliveryPhotos.length} foto(s) de evidencia
                    </div>
                  </div>
                </div>
              ))}

              {deliveredDispatches.length === 0 && (
                <p className="text-center text-gray-500 py-8">No hay entregas completadas hoy</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Fotos */}
      <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Completar Entrega</DialogTitle>
          </DialogHeader>
          
          {selectedDispatch && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="font-semibold">
                  {selectedDispatch.documentType} {selectedDispatch.documentNumber}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedDispatch.direccion}, {selectedDispatch.comuna}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fotos de Evidencia * {photos.length > 0 && `(${photos.length} seleccionada${photos.length > 1 ? 's' : ''})`}
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="mb-2"
                />
                <p className="text-xs text-gray-500">
                  Toma fotos con la cámara o selecciona de la galería (máx. 5MB por foto)
                </p>

                {/* Preview de fotos seleccionadas */}
                {photoPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comentarios (Opcional)
                </label>
                <Textarea
                  value={photoComment}
                  onChange={(e) => setPhotoComment(e.target.value)}
                  placeholder="Observaciones sobre la entrega..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setPhotoModalOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handlePhotoUpload}
                  disabled={photos.length === 0 || actionLoading === selectedDispatch.id}
                  className="flex-1"
                >
                  {actionLoading === selectedDispatch.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Completar Entrega
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}