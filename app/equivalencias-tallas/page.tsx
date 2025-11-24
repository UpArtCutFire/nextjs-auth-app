'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Settings, Pencil, Save, AlertCircle, Scale } from 'lucide-react';
import { toast } from 'sonner';

interface SizeEquivalence {
  id: string;
  size: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  value: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface EditFormData {
  value: number;
  description: string;
}

export default function EquivalenciasTallasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [equivalences, setEquivalences] = useState<SizeEquivalence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEquivalence, setEditingEquivalence] = useState<SizeEquivalence | null>(null);
  const [formData, setFormData] = useState<EditFormData>({
    value: 1,
    description: ''
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    // Verificar que solo administradores puedan acceder
    const userProfile = (session.user as any)?.perfil;
    const isAdmin = userProfile === 'administrador' || 
                   session.user?.email === 'john@doe.com' || 
                   session.user?.email === 'admin@test.com';
    
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }

    fetchEquivalences();
  }, [session, status, router]);

  const fetchEquivalences = async () => {
    try {
      const response = await fetch('/api/size-equivalences');
      if (response.ok) {
        const data = await response.json();
        setEquivalences(data);
      } else {
        throw new Error('Error al cargar equivalencias');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar las equivalencias de tallas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (equivalence: SizeEquivalence) => {
    setEditingEquivalence(equivalence);
    setFormData({
      value: equivalence.value,
      description: equivalence.description || ''
    });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingEquivalence(null);
    setFormData({
      value: 1,
      description: ''
    });
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingEquivalence) return;

    if (formData.value < 1 || formData.value > 50) {
      toast.error('El valor debe estar entre 1 y 50 puntos');
      return;
    }

    setSaving(true);

    try {
      const updatedEquivalences = equivalences.map(eq => 
        eq.id === editingEquivalence.id 
          ? { ...eq, value: formData.value, description: formData.description }
          : eq
      );

      const response = await fetch('/api/size-equivalences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          equivalences: updatedEquivalences.map(eq => ({
            size: eq.size,
            value: eq.value,
            description: eq.description
          }))
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Equivalencia actualizada exitosamente');
        handleCloseEditModal();
        fetchEquivalences();
      } else {
        throw new Error(data.error || 'Error al actualizar equivalencia');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar equivalencia');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);

    try {
      const response = await fetch('/api/size-equivalences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          equivalences: equivalences.map(eq => ({
            size: eq.size,
            value: eq.value,
            description: eq.description
          }))
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Configuración guardada exitosamente');
        fetchEquivalences();
      } else {
        throw new Error(data.error || 'Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const getSizeBadgeColor = (size: string) => {
    switch (size) {
      case 'S': return 'bg-blue-500';
      case 'M': return 'bg-green-500';
      case 'L': return 'bg-yellow-500';
      case 'XL': return 'bg-red-500';
      case 'XXL': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getSizeDescription = (size: string) => {
    switch (size) {
      case 'S': return 'Pequeño';
      case 'M': return 'Mediano';
      case 'L': return 'Grande';
      case 'XL': return 'Extra Grande';
      case 'XXL': return 'Extra Extra Grande';
      default: return size;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Cargando equivalencias...</p>
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
              <Scale className="h-6 w-6" />
              <div>
                <CardTitle>Equivalencias de Tallas</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Configura el valor en puntos para cada tamaño de despacho
                </p>
              </div>
            </div>
            <Button onClick={handleSaveAll} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Todo'}
            </Button>
          </CardHeader>
          <CardContent>
            {/* Información importante */}
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span className="font-semibold text-amber-800">Información Importante</span>
              </div>
              <div className="text-sm text-amber-700 space-y-1">
                <p>• Las equivalencias determinan cuántos puntos ocupa cada tamaño en la capacidad de los transportes</p>
                <p>• Los cambios afectan inmediatamente la planificación de nuevos despachos</p>
                <p>• Los despachos ya planificados mantienen su configuración original</p>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Talla</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Valor (Puntos)</TableHead>
                    <TableHead>Última Actualización</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equivalences.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No hay equivalencias configuradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    equivalences.map((equivalence) => (
                      <TableRow key={equivalence.id}>
                        <TableCell>
                          <Badge className={getSizeBadgeColor(equivalence.size)}>
                            {equivalence.size}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {equivalence.description || getSizeDescription(equivalence.size)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold">{equivalence.value}</span>
                            <span className="text-sm text-gray-500">
                              punto{equivalence.value !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(equivalence.updatedAt).toLocaleDateString('es-CL', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditModal(equivalence)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modal de edición */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Editar Equivalencia - Talla {editingEquivalence?.size}
              </DialogTitle>
              <DialogDescription>
                Modifica el valor en puntos para la talla {editingEquivalence?.size}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitEdit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="value">
                    Valor (Puntos)
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.value}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      value: parseInt(e.target.value) || 1 
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Descripción
                  </Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      description: e.target.value 
                    })}
                    placeholder="Opcional"
                  />
                </div>
                
                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                  <strong>Recomendaciones:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>S (Pequeño): 1-2 puntos</li>
                    <li>M (Mediano): 2-3 puntos</li>
                    <li>L (Grande): 3-5 puntos</li>
                    <li>XL (Extra Grande): 4-8 puntos</li>
                    <li>XXL (Extra Extra Grande): 8-15 puntos</li>
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseEditModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}