'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Edit, Trash2, Plus, Building2, MapPin, Phone } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Branch {
  id: string
  nombre: string
  direccion: string
  telefono?: string | null
  activo: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    dispatches: number
  }
}

interface BranchFormData {
  nombre: string
  direccion: string
  telefono: string
}

export default function SucursalesPage() {
  const { data: session } = useSession()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState<BranchFormData>({
    nombre: '',
    direccion: '',
    telefono: ''
  })

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches')
      if (response.ok) {
        const data = await response.json()
        setBranches(data)
      } else {
        console.error('Error al cargar sucursales')
        toast.error('Error al cargar sucursales')
      }
    } catch (error) {
      console.error('Error al cargar sucursales:', error)
      toast.error('Error al cargar sucursales')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBranches()
  }, [])

  const handleCreateBranch = async () => {
    if (!formData.nombre.trim() || !formData.direccion.trim()) {
      toast.error('Nombre y dirección son requeridos')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Sucursal creada exitosamente')
        setIsCreateDialogOpen(false)
        setFormData({ nombre: '', direccion: '', telefono: '' })
        fetchBranches()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al crear sucursal')
      }
    } catch (error) {
      console.error('Error al crear sucursal:', error)
      toast.error('Error al crear sucursal')
    } finally {
      setCreating(false)
    }
  }

  const handleEditBranch = async () => {
    if (!editingBranch || !formData.nombre.trim() || !formData.direccion.trim()) {
      toast.error('Nombre y dirección son requeridos')
      return
    }

    setUpdating(true)
    try {
      const response = await fetch('/api/branches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBranch.id,
          ...formData,
          activo: editingBranch.activo
        })
      })

      if (response.ok) {
        toast.success('Sucursal actualizada exitosamente')
        setIsEditDialogOpen(false)
        setEditingBranch(null)
        setFormData({ nombre: '', direccion: '', telefono: '' })
        fetchBranches()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al actualizar sucursal')
      }
    } catch (error) {
      console.error('Error al actualizar sucursal:', error)
      toast.error('Error al actualizar sucursal')
    } finally {
      setUpdating(false)
    }
  }

  const handleToggleActive = async (branch: Branch) => {
    try {
      const response = await fetch('/api/branches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: branch.id,
          nombre: branch.nombre,
          direccion: branch.direccion,
          telefono: branch.telefono,
          activo: !branch.activo
        })
      })

      if (response.ok) {
        toast.success(`Sucursal ${!branch.activo ? 'activada' : 'desactivada'} exitosamente`)
        fetchBranches()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al cambiar estado de sucursal')
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error)
      toast.error('Error al cambiar estado de sucursal')
    }
  }

  const handleDeleteBranch = async (branch: Branch) => {
    if (!confirm(`¿Está seguro de eliminar la sucursal "${branch.nombre}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/branches?id=${branch.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Sucursal eliminada exitosamente')
        fetchBranches()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al eliminar sucursal')
      }
    } catch (error) {
      console.error('Error al eliminar sucursal:', error)
      toast.error('Error al eliminar sucursal')
    }
  }

  const openEditDialog = (branch: Branch) => {
    setEditingBranch(branch)
    setFormData({
      nombre: branch.nombre,
      direccion: branch.direccion,
      telefono: branch.telefono || ''
    })
    setIsEditDialogOpen(true)
  }

  const openCreateDialog = () => {
    setFormData({ nombre: '', direccion: '', telefono: '' })
    setIsCreateDialogOpen(true)
  }

  if (!session?.user) {
    return <div>Cargando...</div>
  }

  const isAdmin = session.user.perfil === 'administrador'

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Sucursales</h1>
          <p className="text-gray-600 mt-2">
            Administra las sucursales para retiros locales y despachos
          </p>
        </div>
        
        {isAdmin && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Sucursal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Sucursal</DialogTitle>
                <DialogDescription>
                  Ingrese los datos de la nueva sucursal
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Sucursal Centro"
                  />
                </div>
                <div>
                  <Label htmlFor="direccion">Dirección *</Label>
                  <Textarea
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Dirección completa de la sucursal"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateBranch} disabled={creating}>
                  {creating ? 'Creando...' : 'Crear Sucursal'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!isAdmin && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-blue-700">
              <strong>Vista de solo lectura:</strong> Solo los administradores pueden crear, editar o eliminar sucursales.
            </p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="text-center p-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay sucursales</h3>
            <p className="text-gray-600 mb-4">
              {isAdmin 
                ? 'Crea la primera sucursal para comenzar'
                : 'Aún no se han creado sucursales'
              }
            </p>
            {isAdmin && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Sucursal
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <Card key={branch.id} className={`${!branch.activo ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      {branch.nombre}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        branch.activo 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {branch.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(branch)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteBranch(branch)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{branch.direccion}</span>
                </div>
                
                {branch.telefono && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">{branch.telefono}</span>
                  </div>
                )}

                {isAdmin && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-gray-600">Estado:</span>
                    <Switch
                      checked={branch.activo}
                      onCheckedChange={() => handleToggleActive(branch)}
                    />
                  </div>
                )}
                
                <div className="text-xs text-gray-500 pt-2 border-t">
                  Creada: {new Date(branch.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sucursal</DialogTitle>
            <DialogDescription>
              Modifique los datos de la sucursal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-nombre">Nombre *</Label>
              <Input
                id="edit-nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Sucursal Centro"
              />
            </div>
            <div>
              <Label htmlFor="edit-direccion">Dirección *</Label>
              <Textarea
                id="edit-direccion"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="Dirección completa de la sucursal"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-telefono">Teléfono</Label>
              <Input
                id="edit-telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="+56 9 1234 5678"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditBranch} disabled={updating}>
              {updating ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}