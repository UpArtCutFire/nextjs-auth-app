'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
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
import { Truck, Package, User, MapPin, Phone, Mail, Edit3, Eye, Trash2, Calendar, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { regiones, getComunasByRegion } from '@/lib/chile-data';
import { ERPDocument } from '@/lib/types';

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentNumber: string;
  documentType: string;
  vendorCode: string;
  clienteNombre: string;
  document?: ERPDocument | null;
  documentInfo?: any;
}

interface Branch {
  id: string;
  nombre: string;
  direccion: string;
  telefono?: string | null;
  activo: boolean;
}

interface Dispatch {
  id?: string;
  documentNumber: string;
  documentType: string;
  vendorCode: string;
  direccion: string;
  comuna: string;
  region: string;
  telefono?: string;
  correo?: string;
  tamanoDespacho: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  tipoDespacho: 'RETIRO_LOCAL' | 'COURIER' | 'DESPACHO';
  branchId?: string | null;
  clienteNombre: string;
  userId?: string;
  suggestedDeliveryDate?: string;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    nombre: string;
    correo: string;
  };
  branch?: Branch;
}

export function DispatchModal({
  isOpen,
  onClose,
  documentNumber,
  documentType,
  vendorCode,
  clienteNombre,
  document
}: DispatchModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [existingDispatch, setExistingDispatch] = useState<Dispatch | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [formData, setFormData] = useState({
    direccion: '',
    comuna: '',
    region: '',
    telefono: '',
    correo: '',
    tamanoDespacho: 'M' as 'S' | 'M' | 'L' | 'XL' | 'XXL',
    tipoDespacho: 'DESPACHO' as 'RETIRO_LOCAL' | 'COURIER' | 'DESPACHO',
    branchId: '',
    suggestedDeliveryDate: ''
  });

  const isAdmin = (session?.user as any)?.perfil === 'administrador' || session?.user?.email === 'john@doe.com';
  const isVendor = (session?.user as any)?.perfil === 'vendedor';

  useEffect(() => {
    if (isOpen) {
      fetchDispatch();
      fetchBranches();
    }
  }, [isOpen, documentNumber, documentType]);

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches');
      if (response.ok) {
        const data = await response.json();
        setBranches(data.filter((branch: Branch) => branch.activo));
      }
    } catch (error) {
      console.error('Error al cargar sucursales:', error);
    }
  };

  const fetchDispatch = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/dispatches?documentNumber=${documentNumber}&documentType=${documentType}`
      );
      
      if (response.ok) {
        const dispatch = await response.json();
        if (dispatch) {
          setExistingDispatch(dispatch);
          setFormData({
            direccion: dispatch.direccion || '',
            comuna: dispatch.comuna || '',
            region: dispatch.region || '',
            telefono: dispatch.telefono || '',
            correo: dispatch.correo || '',
            tamanoDespacho: dispatch.tamanoDespacho || 'M',
            tipoDespacho: dispatch.tipoDespacho || 'DESPACHO',
            branchId: dispatch.branchId || '',
            suggestedDeliveryDate: dispatch.suggestedDeliveryDate ? (() => {
              const date = new Date(dispatch.suggestedDeliveryDate);
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            })() : ''
          });
          setSelectedRegion(dispatch.region || '');
        } else {
          setExistingDispatch(null);
          setIsEditing(true); // Si no existe, permitir crear
        }
      }
    } catch (error) {
      console.error('Error al cargar despacho:', error);
      toast.error('Error al cargar información del despacho');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones base
    if (!formData.tamanoDespacho || !formData.tipoDespacho) {
      toast.error('Tipo de despacho y tamaño son obligatorios');
      return;
    }

    // Validar que se seleccione sucursal para RETIRO_LOCAL y DESPACHO
    if ((formData.tipoDespacho === 'RETIRO_LOCAL' || formData.tipoDespacho === 'DESPACHO') && !formData.branchId) {
      toast.error('Debe seleccionar una sucursal para retiro local o despacho');
      return;
    }

    // Para Courier y Despacho, la dirección es obligatoria
    if (formData.tipoDespacho !== 'RETIRO_LOCAL') {
      if (!formData.direccion || !formData.comuna || !formData.region) {
        toast.error('Dirección, comuna y región son obligatorios para courier y despacho');
        return;
      }
    }

    setLoading(true);
    try {
      const url = '/api/dispatches';
      const method = existingDispatch ? 'PUT' : 'POST';
      const body = existingDispatch 
        ? { ...formData, id: existingDispatch.id }
        : {
            ...formData,
            documentNumber,
            documentType,
            vendorCode,
            clienteNombre,
            documentInfo: document ? JSON.stringify(document) : null
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          existingDispatch 
            ? 'Despacho actualizado exitosamente' 
            : 'Despacho creado exitosamente'
        );
        setIsEditing(false);
        fetchDispatch(); // Recargar datos
      } else {
        throw new Error(data.error || 'Error al guardar despacho');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar despacho');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setShowDeleteConfirmation(false);
    setFormData({
      direccion: '',
      comuna: '',
      region: '',
      telefono: '',
      correo: '',
      tamanoDespacho: 'M',
      tipoDespacho: 'DESPACHO',
      branchId: '',
      suggestedDeliveryDate: ''
    });
    setSelectedRegion('');
    setExistingDispatch(null);
    onClose();
  };

  const handleDelete = async () => {
    if (!existingDispatch?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/dispatches?id=${existingDispatch.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Despacho eliminado exitosamente');
        handleClose();
      } else {
        throw new Error(data.error || 'Error al eliminar despacho');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar despacho');
    } finally {
      setLoading(false);
      setShowDeleteConfirmation(false);
    }
  };

  const getTamanoColor = (tamano: string) => {
    switch (tamano) {
      case 'S': return 'bg-blue-500';
      case 'M': return 'bg-green-500';
      case 'L': return 'bg-yellow-500';
      case 'XL': return 'bg-orange-500';
      case 'XXL': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const comunasDisponibles = getComunasByRegion(selectedRegion);

  if (loading && !existingDispatch) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Truck className="h-5 w-5" />
            <DialogTitle>Información de Despacho</DialogTitle>
          </div>
          <DialogDescription>
            <div className="flex items-center space-x-2 mt-2">
              <User className="h-4 w-4" />
              <span className="font-medium">{clienteNombre}</span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Documento: {documentType} {documentNumber}
            </div>
          </DialogDescription>
        </DialogHeader>

        {existingDispatch && !isEditing ? (
          // Vista de solo lectura
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Tipo de Despacho</Label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-sm">
                    {existingDispatch.tipoDespacho === 'RETIRO_LOCAL' ? 'Retiro Local' : 
                     existingDispatch.tipoDespacho === 'COURIER' ? 'Courier' : 'Despacho'}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Tamaño Despacho</Label>
                <div className="mt-1">
                  <Badge className={getTamanoColor(existingDispatch.tamanoDespacho)}>
                    {existingDispatch.tamanoDespacho}
                  </Badge>
                </div>
              </div>
            </div>

            {existingDispatch.branch && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  {existingDispatch.tipoDespacho === 'RETIRO_LOCAL' ? 'Sucursal de Retiro' : 'Sucursal de Despacho'}
                </Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{existingDispatch.branch.nombre}</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">{existingDispatch.branch.direccion}</p>
                {existingDispatch.branch.telefono && (
                  <p className="text-sm text-muted-foreground ml-6">📞 {existingDispatch.branch.telefono}</p>
                )}
                {existingDispatch.tipoDespacho === 'RETIRO_LOCAL' && (
                  <div className="mt-2 ml-6">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      📦 El cliente retirará el pedido en esta sucursal
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Información de ubicación - solo si NO es Retiro Local */}
            {existingDispatch.tipoDespacho !== 'RETIRO_LOCAL' && existingDispatch.direccion && (
              <>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Dirección de Entrega</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{existingDispatch.direccion}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Comuna</Label>
                    <p className="mt-1">{existingDispatch.comuna}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Región</Label>
                    <p className="mt-1">{regiones.find(r => r.id === existingDispatch.region)?.nombre || existingDispatch.region}</p>
                  </div>
                </div>
              </>
            )}

            {(existingDispatch.telefono || existingDispatch.correo) && (
              <div className="grid grid-cols-2 gap-4">
                {existingDispatch.telefono && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Teléfono</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{existingDispatch.telefono}</span>
                    </div>
                  </div>
                )}
                {existingDispatch.correo && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Correo</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{existingDispatch.correo}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {existingDispatch.suggestedDeliveryDate && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Fecha Entrega Sugerida</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-blue-600">
                    {(() => {
                      const date = new Date(existingDispatch.suggestedDeliveryDate);
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    })()}
                  </span>
                </div>
              </div>
            )}

            {existingDispatch.user && (
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium text-muted-foreground">Creado por</Label>
                <p className="mt-1 text-sm">{existingDispatch.user.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(existingDispatch.createdAt!).toLocaleDateString('es-CL')}
                </p>
              </div>
            )}
          </div>
        ) : (
          // Formulario de edición/creación
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipoDespacho">Tipo de Despacho *</Label>
                  <Select
                    value={formData.tipoDespacho}
                    onValueChange={(value: 'RETIRO_LOCAL' | 'COURIER' | 'DESPACHO') => {
                      setFormData({ 
                        ...formData, 
                        tipoDespacho: value, 
                        branchId: value === 'COURIER' ? '' : formData.branchId,
                        // Limpiar dirección, región y comuna si es Retiro Local
                        direccion: value === 'RETIRO_LOCAL' ? '' : formData.direccion,
                        region: value === 'RETIRO_LOCAL' ? '' : formData.region,
                        comuna: value === 'RETIRO_LOCAL' ? '' : formData.comuna
                      });
                      // Limpiar selectedRegion si es Retiro Local
                      if (value === 'RETIRO_LOCAL') {
                        setSelectedRegion('');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RETIRO_LOCAL">Retiro Local</SelectItem>
                      <SelectItem value="COURIER">Courier</SelectItem>
                      <SelectItem value="DESPACHO">Despacho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tamanoDespacho">Tamaño Despacho *</Label>
                  <Select
                    value={formData.tamanoDespacho}
                    onValueChange={(value: 'S' | 'M' | 'L' | 'XL' | 'XXL') => 
                      setFormData({ ...formData, tamanoDespacho: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione tamaño" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S">S - Pequeño</SelectItem>
                      <SelectItem value="M">M - Mediano</SelectItem>
                      <SelectItem value="L">L - Grande</SelectItem>
                      <SelectItem value="XL">XL - Extra Grande</SelectItem>
                      <SelectItem value="XXL">XXL - Extra Extra Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sucursal - Solo para Retiro Local y Despacho */}
              {(formData.tipoDespacho === 'RETIRO_LOCAL' || formData.tipoDespacho === 'DESPACHO') && (
                <div>
                  <Label htmlFor="branchId">
                    Sucursal {formData.tipoDespacho === 'RETIRO_LOCAL' ? 'de Retiro' : 'de Despacho'} *
                  </Label>
                  <Select
                    value={formData.branchId}
                    onValueChange={(value) => setFormData({ ...formData, branchId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{branch.nombre}</span>
                            <span className="text-sm text-muted-foreground">{branch.direccion}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {branches.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      No hay sucursales activas disponibles. Contacte al administrador.
                    </p>
                  )}
                </div>
              )}

              {/* Dirección - Solo mostrar si NO es Retiro Local */}
              {formData.tipoDespacho !== 'RETIRO_LOCAL' && (
                <div>
                  <Label htmlFor="direccion">
                    Dirección de Entrega *
                  </Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Dirección donde entregar el pedido"
                    required
                  />
                </div>
              )}

              {/* Región y Comuna - Solo mostrar si NO es Retiro Local */}
              {formData.tipoDespacho !== 'RETIRO_LOCAL' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="region">Región *</Label>
                    <Select
                      value={formData.region}
                      onValueChange={(value) => {
                        setFormData({ ...formData, region: value, comuna: '' });
                        setSelectedRegion(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione región" />
                      </SelectTrigger>
                      <SelectContent>
                        {regiones.map((region) => (
                          <SelectItem key={region.id} value={region.id}>
                            {region.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="comuna">Comuna *</Label>
                    <Select
                      value={formData.comuna}
                      onValueChange={(value) => setFormData({ ...formData, comuna: value })}
                      disabled={!selectedRegion}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione comuna" />
                      </SelectTrigger>
                      <SelectContent>
                        {comunasDisponibles.map((comuna) => (
                          <SelectItem key={comuna.id} value={comuna.nombre}>
                            {comuna.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="Ej: +56 9 1234 5678"
                  />
                </div>
                <div>
                  <Label htmlFor="correo">Correo</Label>
                  <Input
                    id="correo"
                    type="email"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    placeholder="ejemplo@correo.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="suggestedDeliveryDate">Fecha Entrega Sugerida</Label>
                <Input
                  id="suggestedDeliveryDate"
                  type="date"
                  value={formData.suggestedDeliveryDate}
                  min={(() => {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    const todayFormatted = `${year}-${month}-${day}`;
                    
                    // Si estamos editando y ya hay una fecha sugerida anterior, permitirla
                    if (existingDispatch?.suggestedDeliveryDate) {
                      const existingDate = new Date(existingDispatch.suggestedDeliveryDate);
                      const existingYear = existingDate.getFullYear();
                      const existingMonth = String(existingDate.getMonth() + 1).padStart(2, '0');
                      const existingDay = String(existingDate.getDate()).padStart(2, '0');
                      const existingFormatted = `${existingYear}-${existingMonth}-${existingDay}`;
                      return existingFormatted < todayFormatted ? existingFormatted : todayFormatted;
                    }
                    // Para nuevos despachos, desde hoy
                    return todayFormatted;
                  })()}
                  onChange={(e) => setFormData({ ...formData, suggestedDeliveryDate: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Fecha recomendada para la entrega. Esta información ayudará al planificador.
                </p>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : (existingDispatch ? 'Actualizar' : 'Crear')}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Botones de acción cuando no está editando */}
        {existingDispatch && !isEditing && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cerrar
            </Button>
            {isAdmin && (
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteConfirmation(true)}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            )}
            {isVendor && !isAdmin && (
              <Button onClick={() => setIsEditing(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </DialogFooter>
        )}

        {/* Mostrar botón crear para vendedores cuando no existe despacho */}
        {!existingDispatch && !isEditing && isVendor && !isAdmin && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cerrar
            </Button>
            <Button onClick={() => setIsEditing(true)}>
              <Package className="h-4 w-4 mr-2" />
              Crear Despacho
            </Button>
          </DialogFooter>
        )}
      </DialogContent>

      {/* AlertDialog para confirmación de eliminación */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el despacho 
              del documento {documentType} {documentNumber} para el cliente {clienteNombre}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}