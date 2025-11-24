'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil, Plus, Truck, Settings, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Transport {
  id: string;
  patente: string;
  nombre: string;
  talla: 'S' | 'M' | 'L' | 'XL';
  activo: boolean;
  totalCapacity: number;
  createdAt: string;
  updatedAt: string;
}

export default function TransportesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transportes, setTransportes] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingTransport, setEditingTransport] = useState<Transport | null>(null);
  const [configuringTransport, setConfiguringTransport] = useState<Transport | null>(null);
  const [formData, setFormData] = useState({
    patente: '',
    nombre: '',
    talla: 'M' as 'S' | 'M' | 'L' | 'XL',
    activo: true
  });

  const [configData, setConfigData] = useState({
    totalCapacity: 12
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    fetchTransportes();
  }, [session, status, router]);

  const fetchTransportes = async () => {
    try {
      const response = await fetch('/api/transports');
      if (response.ok) {
        const data = await response.json();
        setTransportes(data);
      } else {
        throw new Error('Error al cargar transportes');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar los transportes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (transport?: Transport) => {
    if (transport) {
      setEditingTransport(transport);
      setFormData({
        patente: transport.patente,
        nombre: transport.nombre,
        talla: transport.talla,
        activo: transport.activo
      });
    } else {
      setEditingTransport(null);
      setFormData({
        patente: '',
        nombre: '',
        talla: 'M',
        activo: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTransport(null);
    setFormData({
      patente: '',
      nombre: '',
      talla: 'M',
      activo: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patente || !formData.nombre || !formData.talla) {
      toast.error('Todos los campos son requeridos');
      return;
    }

    try {
      const url = '/api/transports';
      const method = editingTransport ? 'PUT' : 'POST';
      const body = editingTransport 
        ? { ...formData, id: editingTransport.id }
        : formData;

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
          editingTransport 
            ? 'Transporte actualizado exitosamente' 
            : 'Transporte creado exitosamente'
        );
        handleCloseModal();
        fetchTransportes();
      } else {
        throw new Error(data.error || 'Error al guardar transporte');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar transporte');
    }
  };

  const handleToggleActivo = async (transport: Transport) => {
    try {
      const response = await fetch('/api/transports', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: transport.id,
          activo: !transport.activo
        }),
      });

      if (response.ok) {
        toast.success(
          transport.activo 
            ? 'Transporte desactivado' 
            : 'Transporte activado'
        );
        fetchTransportes();
      } else {
        throw new Error('Error al actualizar estado');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar estado del transporte');
    }
  };

  const handleOpenConfigModal = (transport: Transport) => {
    setConfiguringTransport(transport);
    setConfigData({
      totalCapacity: transport.totalCapacity
    });
    setShowConfigModal(true);
  };

  const handleCloseConfigModal = () => {
    setShowConfigModal(false);
    setConfiguringTransport(null);
    setConfigData({
      totalCapacity: 12
    });
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!configuringTransport) return;

    if (configData.totalCapacity < 1) {
      toast.error('La capacidad total debe ser mayor a 0');
      return;
    }

    try {
      const response = await fetch('/api/transports/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: configuringTransport.id,
          totalCapacity: configData.totalCapacity
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Configuración actualizada exitosamente');
        handleCloseConfigModal();
        fetchTransportes();
      } else {
        throw new Error(data.error || 'Error al actualizar configuración');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar configuración');
    }
  };

  const handleDeleteTransport = async (transport: Transport) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el transporte ${transport.patente}?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch('/api/transports', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: transport.id }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Transporte eliminado exitosamente');
        fetchTransportes();
      } else {
        throw new Error(data.error || 'Error al eliminar transporte');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar transporte');
    }
  };

  const getTallaBadgeColor = (talla: string) => {
    switch (talla) {
      case 'S': return 'bg-blue-500';
      case 'M': return 'bg-green-500';
      case 'L': return 'bg-yellow-500';
      case 'XL': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Cargando transportes...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <Truck className="h-6 w-6" />
              <CardTitle>Mantenedor de Transportes</CardTitle>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Transporte
            </Button>
          </CardHeader>
          <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patente</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Talla</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Capacidad Total</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transportes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay transportes registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  transportes.map((transport) => (
                    <TableRow key={transport.id}>
                      <TableCell className="font-medium">{transport.patente}</TableCell>
                      <TableCell>{transport.nombre}</TableCell>
                      <TableCell>
                        <Badge className={getTallaBadgeColor(transport.talla)}>
                          {transport.talla}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={transport.activo ? 'default' : 'secondary'}
                          className="cursor-pointer"
                          onClick={() => handleToggleActivo(transport)}
                        >
                          {transport.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>{transport.totalCapacity} puntos</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(transport.createdAt).toLocaleDateString('es-CL')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(transport)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenConfigModal(transport)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTransport(transport)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingTransport ? 'Editar Transporte' : 'Nuevo Transporte'}
            </DialogTitle>
            <DialogDescription>
              {editingTransport 
                ? 'Modifica los datos del transporte' 
                : 'Ingresa los datos del nuevo transporte'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="patente" className="text-right">
                  Patente
                </Label>
                <Input
                  id="patente"
                  value={formData.patente}
                  onChange={(e) => setFormData({ ...formData, patente: e.target.value.toUpperCase() })}
                  className="col-span-3"
                  placeholder="Ej: ABCD12"
                  maxLength={10}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nombre" className="text-right">
                  Nombre
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="col-span-3"
                  placeholder="Ej: Camión Refrigerado"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="talla" className="text-right">
                  Talla
                </Label>
                <Select
                  value={formData.talla}
                  onValueChange={(value: 'S' | 'M' | 'L' | 'XL') => 
                    setFormData({ ...formData, talla: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecciona una talla" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S">S - Pequeño</SelectItem>
                    <SelectItem value="M">M - Mediano</SelectItem>
                    <SelectItem value="L">L - Grande</SelectItem>
                    <SelectItem value="XL">XL - Extra Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingTransport ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Configuración */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Configurar Capacidad del Camión
            </DialogTitle>
            <DialogDescription>
              Define la capacidad total en puntos para {configuringTransport?.patente}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfigSubmit}>
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="totalCapacity">
                  Capacidad Total del Camión (en puntos)
                </Label>
                <Input
                  id="totalCapacity"
                  type="number"
                  min="1"
                  max="100"
                  value={configData.totalCapacity}
                  onChange={(e) => setConfigData({ 
                    ...configData, 
                    totalCapacity: parseInt(e.target.value) || 1 
                  })}
                  placeholder="Ej: 12"
                />
              </div>
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-4 w-4" />
                  <span className="font-semibold">Sistema de Equivalencias</span>
                </div>
                <div className="space-y-1">
                  <p className="font-medium mb-2">Equivalencias de tallas:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>• Talla S = 1 punto</div>
                    <div>• Talla M = 2 puntos</div>
                    <div>• Talla L = 3 puntos</div>
                    <div>• Talla XL = 4 puntos</div>
                    <div>• Talla XXL = 10 puntos</div>
                  </div>
                  <p className="mt-2 text-xs">
                    La capacidad determina cuántos puntos de despachos puede transportar este camión por horario (AM/PM).
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseConfigModal}>
                Cancelar
              </Button>
              <Button type="submit">
                Guardar Configuración
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
}