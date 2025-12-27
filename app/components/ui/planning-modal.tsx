'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, MapPin, User, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { SizeEquivalence, fetchSizeEquivalences, getSizePoints } from '@/lib/size-equivalences';

interface Transport {
  id: string;
  patente: string;
  nombre: string;
  talla: 'S' | 'M' | 'L' | 'XL';
  activo: boolean;
  totalCapacity: number;
}

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
  suggestedDeliveryDate?: string;
  transportId?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    nombre: string;
    correo: string;
  };
  transport?: Transport;
}

interface PlanningModalProps {
  dispatch: Dispatch;
  onClose: () => void;
  onSuccess: () => void;
}


export function PlanningModal({ dispatch, onClose, onSuccess }: PlanningModalProps) {
  // Función helper para formatear fecha a YYYY-MM-DD sin problemas de timezone
  const formatDateForInput = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [scheduledDate, setScheduledDate] = useState(
    dispatch.scheduledDate ? formatDateForInput(dispatch.scheduledDate) : 
    dispatch.suggestedDeliveryDate ? formatDateForInput(dispatch.suggestedDeliveryDate) : 
    ''
  );
  const [scheduledPeriod, setScheduledPeriod] = useState(dispatch.scheduledPeriod || '');
  const [transportId, setTransportId] = useState(dispatch.transportId || '');
  const [transports, setTransports] = useState<Transport[]>([]);
  const [sizeEquivalences, setSizeEquivalences] = useState<SizeEquivalence[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTransports, setLoadingTransports] = useState(true);
  const [loadingEquivalences, setLoadingEquivalences] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch transportes
        const transportsResponse = await fetch('/api/transports');
        if (transportsResponse.ok) {
          const transportsData = await transportsResponse.json();
          // Filtrar solo transportes activos
          const activeTransports = transportsData.filter((t: Transport) => t.activo);
          setTransports(activeTransports);
        }
      } catch (error) {
        console.error('Error loading transports:', error);
      } finally {
        setLoadingTransports(false);
      }

      try {
        // Fetch equivalencias de tallas usando la utility function
        const equivalencesData = await fetchSizeEquivalences();
        setSizeEquivalences(equivalencesData);
      } catch (error) {
        console.error('Error loading size equivalences:', error);
      } finally {
        setLoadingEquivalences(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scheduledDate || !scheduledPeriod || !transportId) {
      toast.error('Fecha, horario y transporte son requeridos');
      return;
    }

    // COMENTAMOS LA VALIDACIÓN DE FECHA TEMPORALMENTE
    // La validación de fecha se hará solo en el backend si es necesaria
    
    /*
    // Validar que la fecha no sea en el pasado (permitir desde hoy)
    // Comparar solo las fechas sin considerar horas ni zonas horarias
    const selectedDateStr = scheduledDate; // formato YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0]; // formato YYYY-MM-DD
    
    console.log('Fecha seleccionada:', selectedDateStr);
    console.log('Fecha de hoy:', todayStr);
    console.log('Comparación:', selectedDateStr < todayStr);
    
    if (selectedDateStr < todayStr) {
      toast.error('La fecha programada no puede ser anterior a hoy');
      return;
    }
    */

    setLoading(true);

    try {
      const response = await fetch('/api/dispatches/plan', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: dispatch.id,
          scheduledDate,
          scheduledPeriod,
          transportId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Despacho planificado exitosamente');
        onSuccess();
      } else {
        throw new Error(data.error || 'Error al planificar despacho');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al planificar despacho');
    } finally {
      setLoading(false);
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

  const getSizePointsForDispatch = (size: string): number => {
    return getSizePoints(size, sizeEquivalences);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Planificar Despacho
          </DialogTitle>
          <DialogDescription>
            Asigna fecha y horario para el despacho
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del despacho */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg">{dispatch.clienteNombre}</h4>
              {getSizeBadge(dispatch.tamanoDespacho)}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {dispatch.direccion}, {dispatch.comuna}, {dispatch.region}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              Vendedor: {dispatch.user.nombre}
            </div>

            <div className="text-sm">
              <strong>Documento:</strong> {dispatch.documentType} {dispatch.documentNumber}
            </div>

            {dispatch.telefono && (
              <div className="text-sm">
                <strong>Teléfono:</strong> {dispatch.telefono}
              </div>
            )}

            {dispatch.suggestedDeliveryDate && (
              <div className="text-sm bg-yellow-50 p-3 rounded-lg border-2 border-yellow-400 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📅</span>
                  <div>
                    <div className="font-bold text-yellow-800">
                      Cliente solicitó entrega para:
                    </div>
                    <div className="text-lg font-bold text-yellow-900">
                      {new Date(dispatch.suggestedDeliveryDate).toLocaleDateString('es-CL', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-yellow-700 mt-2 italic">
                  ⚠️ Por favor priorizar esta fecha si es posible
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="scheduledDate">Fecha de Despacho</Label>
                  {dispatch.suggestedDeliveryDate && !dispatch.scheduledDate && (
                    <button
                      type="button"
                      onClick={() => setScheduledDate(new Date(dispatch.suggestedDeliveryDate!).toISOString().split('T')[0])}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Usar fecha sugerida
                    </button>
                  )}
                </div>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={scheduledDate}
                  min={(() => {
                    const today = new Date().toISOString().split('T')[0];
                    // Si hay una fecha programada existente, permitir desde esa fecha
                    if (dispatch.scheduledDate) {
                      const existingDate = new Date(dispatch.scheduledDate).toISOString().split('T')[0];
                      // Retornar la fecha más antigua entre la existente y hoy
                      return existingDate < today ? existingDate : today;
                    }
                    // Si hay una fecha sugerida, permitir desde esa fecha
                    if (dispatch.suggestedDeliveryDate) {
                      const suggestedDate = new Date(dispatch.suggestedDeliveryDate).toISOString().split('T')[0];
                      // Retornar la fecha más antigua entre la sugerida y hoy
                      return suggestedDate < today ? suggestedDate : today;
                    }
                    // Por defecto, desde hoy
                    return today;
                  })()}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                  className={(() => {
                    if (!dispatch.suggestedDeliveryDate || !scheduledDate) return '';
                    const suggested = formatDateForInput(dispatch.suggestedDeliveryDate);
                    return scheduledDate === suggested ? 'border-green-500 bg-green-50' : 'border-orange-400';
                  })()}
                />
                {/* Advertencia si fecha diferente a la solicitada */}
                {dispatch.suggestedDeliveryDate && scheduledDate && (() => {
                  const suggested = formatDateForInput(dispatch.suggestedDeliveryDate);
                  if (scheduledDate !== suggested) {
                    return (
                      <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>La fecha seleccionada es diferente a la solicitada por el cliente</span>
                      </div>
                    );
                  }
                  return (
                    <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <span>✓</span>
                      <span>Coincide con fecha solicitada</span>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledPeriod">Horario</Label>
                <Select
                  value={scheduledPeriod}
                  onValueChange={setScheduledPeriod}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona horario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        AM (Mañana)
                      </div>
                    </SelectItem>
                    <SelectItem value="PM">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        PM (Tarde)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campo de Transporte */}
            <div className="space-y-2">
              <Label htmlFor="transportId">Transporte Asignado</Label>
              {loadingTransports ? (
                <div className="flex items-center gap-2 p-2 border rounded">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  <span className="text-sm text-gray-500">Cargando transportes...</span>
                </div>
              ) : (
                <Select
                  value={transportId}
                  onValueChange={setTransportId}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un transporte" />
                  </SelectTrigger>
                  <SelectContent>
                    {transports.map((transport) => (
                      <SelectItem key={transport.id} value={transport.id}>
                        <div className="flex items-center gap-2 w-full">
                          <Truck className="h-4 w-4" />
                          <span className="font-medium">{transport.patente}</span>
                          <span className="text-gray-500">- {transport.nombre}</span>
                          <div className="flex items-center gap-1 ml-auto">
                            <Badge className={
                              transport.talla === 'S' ? 'bg-blue-500' :
                              transport.talla === 'M' ? 'bg-green-500' :
                              transport.talla === 'L' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }>
                              {transport.talla}
                            </Badge>
                            <span className="text-xs text-gray-500">({transport.totalCapacity}p)</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {transports.length === 0 && !loadingTransports && (
                <p className="text-sm text-gray-500">No hay transportes activos disponibles</p>
              )}
              
              {/* Información de equivalencias */}
              {!loadingEquivalences && sizeEquivalences.length > 0 && (
                <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded mt-2">
                  <div className="font-semibold mb-1">Sistema de Puntos:</div>
                  <div className="grid grid-cols-2 gap-1">
                    {sizeEquivalences.map((eq) => (
                      <div key={eq.id}>• {eq.size} = {eq.value} punto{eq.value !== 1 ? 's' : ''}</div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs">
                    Este despacho <strong>(talla {dispatch.tamanoDespacho})</strong> requiere{' '}
                    <strong>
                      {getSizePointsForDispatch(dispatch.tamanoDespacho)} punto{getSizePointsForDispatch(dispatch.tamanoDespacho) !== 1 ? 's' : ''}
                    </strong>
                  </div>
                </div>
              )}
              
              {loadingEquivalences && (
                <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded mt-2">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900"></div>
                    <span>Cargando equivalencias...</span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Planificando...' : dispatch.status === 'SCHEDULED' ? 'Reprogramar' : 'Planificar'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}