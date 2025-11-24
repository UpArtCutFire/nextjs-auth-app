'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  PieChart, 
  TrendingUp, 
  Clock, 
  Package,
  Truck,
  MapPin,
  Calendar,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface DispatchTableRow {
  id: string;
  fecha: string;
  tipoEntrega: string;
  sucursal: string;
  vendedor: string;
  cliente: string;
  documento: string;
  montoTotal: number;
  fleteTransporte: number;
  montoNetoSinDespacho: number;
  estado: string;
  direccion: string;
  comuna: string;
  region: string;
}

interface DashboardMetrics {
  totalDispatches: number;
  dispatchesByType: {
    RETIRO_LOCAL: number;
    COURIER: number;
    DESPACHO: number;
  };
  dispatchesByStatus: {
    PENDING: number;
    SCHEDULED: number;
    IN_TRANSIT: number;
    DELIVERED: number;
    CANCELLED: number;
  };
  timeMetrics: {
    avgTimeToSchedule: number; // horas
    avgTimeToComplete: number; // horas
    avgTimeInTransit: number; // horas
  };
  performanceMetrics: {
    onTimeDeliveries: number;
    lateDeliveries: number;
    completionRate: number; // porcentaje
  };
  periodComparison: {
    previousPeriod: {
      totalDispatches: number;
      deliveredDispatches: number;
    };
    growth: {
      dispatches: number; // porcentaje
      deliveries: number; // porcentaje
    };
  };
  dispatchesTable?: DispatchTableRow[];
}

export default function DashboardDespachos() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Filtros de fecha
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    preset: 'current_month'
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

    fetchMetrics();
  }, [session, status, router, dateFilter]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate
      });
      
      const response = await fetch(`/api/dispatches/metrics?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      } else {
        throw new Error('Error al cargar métricas');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar las métricas del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDatePreset = (preset: string) => {
    const today = new Date();
    let startDate: string;
    let endDate: string = today.toISOString().split('T')[0];

    switch (preset) {
      case 'today':
        startDate = endDate;
        break;
      case 'week':
        startDate = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
        break;
      case 'current_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        break;
      case 'last_month':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        startDate = lastMonth.toISOString().split('T')[0];
        endDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        startDate = quarterStart.toISOString().split('T')[0];
        break;
      default:
        return;
    }

    setDateFilter({
      startDate,
      endDate,
      preset
    });
  };

  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      const params = new URLSearchParams({
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate
      });

      const response = await fetch(`/api/dispatches/export-excel?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-despachos-${dateFilter.startDate}-${dateFilter.endDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Reporte Excel descargado exitosamente');
      } else {
        throw new Error('Error al generar reporte');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al exportar el reporte Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const formatTime = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    }
    return `${hours.toFixed(1)}h`;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      PENDING: 'bg-gray-500',
      SCHEDULED: 'bg-blue-500',
      IN_TRANSIT: 'bg-orange-500',
      DELIVERED: 'bg-green-500',
      CANCELLED: 'bg-red-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const getTypeColor = (type: string) => {
    const colors = {
      RETIRO_LOCAL: 'bg-purple-500',
      COURIER: 'bg-yellow-500',
      DESPACHO: 'bg-cyan-500'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <BarChart className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard de Despachos</h1>
              <p className="text-gray-500">Análisis y métricas de rendimiento</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              onClick={fetchMetrics}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            
            <Button
              onClick={handleExportExcel}
              disabled={exportLoading || !metrics}
              className="bg-green-600 hover:bg-green-700"
            >
              {exportLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Filtros de Fecha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Fecha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-4">
              {[
                { key: 'today', label: 'Hoy' },
                { key: 'week', label: 'Última Semana' },
                { key: 'current_month', label: 'Mes Actual' },
                { key: 'last_month', label: 'Mes Anterior' },
                { key: 'quarter', label: 'Trimestre' },
              ].map((preset) => (
                <Button
                  key={preset.key}
                  variant={dateFilter.preset === preset.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDatePreset(preset.key)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Fecha Inicio</Label>
                <Input
                  type="date"
                  id="startDate"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter({
                    ...dateFilter,
                    startDate: e.target.value,
                    preset: 'custom'
                  })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Fecha Fin</Label>
                <Input
                  type="date"
                  id="endDate"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter({
                    ...dateFilter,
                    endDate: e.target.value,
                    preset: 'custom'
                  })}
                />
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              <Calendar className="h-4 w-4 inline mr-1" />
              Período: {new Date(dateFilter.startDate).toLocaleDateString('es-CL')} - {new Date(dateFilter.endDate).toLocaleDateString('es-CL')}
            </div>
          </CardContent>
        </Card>

        {metrics && (
          <>
            {/* KPIs Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Despachos</p>
                      <p className="text-3xl font-bold text-gray-900">{metrics.totalDispatches}</p>
                      {metrics.periodComparison.growth.dispatches !== 0 && (
                        <div className="flex items-center text-sm">
                          <TrendingUp className={`h-4 w-4 mr-1 ${metrics.periodComparison.growth.dispatches > 0 ? 'text-green-600' : 'text-red-600'}`} />
                          <span className={metrics.periodComparison.growth.dispatches > 0 ? 'text-green-600' : 'text-red-600'}>
                            {metrics.periodComparison.growth.dispatches > 0 ? '+' : ''}{metrics.periodComparison.growth.dispatches.toFixed(1)}%
                          </span>
                          <span className="text-gray-500 ml-1">vs período anterior</span>
                        </div>
                      )}
                    </div>
                    <Package className="h-12 w-12 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Entregados</p>
                      <p className="text-3xl font-bold text-green-600">{metrics.dispatchesByStatus.DELIVERED}</p>
                      <div className="flex items-center text-sm">
                        <span className="text-gray-600">
                          {metrics.totalDispatches > 0 ? ((metrics.dispatchesByStatus.DELIVERED / metrics.totalDispatches) * 100).toFixed(1) : 0}% del total
                        </span>
                      </div>
                    </div>
                    <Truck className="h-12 w-12 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tiempo Promedio</p>
                      <p className="text-3xl font-bold text-orange-600">{formatTime(metrics.timeMetrics.avgTimeToComplete)}</p>
                      <div className="flex items-center text-sm text-gray-600">
                        <span>Registro → Entrega</span>
                      </div>
                    </div>
                    <Clock className="h-12 w-12 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tasa de Éxito</p>
                      <p className="text-3xl font-bold text-purple-600">{metrics.performanceMetrics.completionRate.toFixed(1)}%</p>
                      <div className="flex items-center text-sm text-gray-600">
                        <span>Entregas completadas</span>
                      </div>
                    </div>
                    <TrendingUp className="h-12 w-12 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos y Estadísticas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribución por Tipo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Distribución por Tipo de Despacho
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(metrics.dispatchesByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getTypeColor(type)}>
                            {type.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {((count / metrics.totalDispatches) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Estados de Despachos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5" />
                    Estados de Despachos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(metrics.dispatchesByStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(status)}>
                            {status.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {((count / metrics.totalDispatches) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Métricas de Tiempo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Análisis de Tiempos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-600">Tiempo hasta Programar</p>
                    <p className="text-2xl font-bold text-blue-600">{formatTime(metrics.timeMetrics.avgTimeToSchedule)}</p>
                    <p className="text-xs text-gray-500">Registro → Programado</p>
                  </div>
                  
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <Truck className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-600">Tiempo en Tránsito</p>
                    <p className="text-2xl font-bold text-orange-600">{formatTime(metrics.timeMetrics.avgTimeInTransit)}</p>
                    <p className="text-xs text-gray-500">En Tránsito → Entregado</p>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <MapPin className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-600">Tiempo Total</p>
                    <p className="text-2xl font-bold text-green-600">{formatTime(metrics.timeMetrics.avgTimeToComplete)}</p>
                    <p className="text-xs text-gray-500">Registro → Entregado</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rendimiento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Métricas de Rendimiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-600">Entregas a Tiempo</p>
                    <p className="text-3xl font-bold text-green-600">{metrics.performanceMetrics.onTimeDeliveries}</p>
                    <p className="text-xs text-gray-500">
                      {metrics.totalDispatches > 0 ? ((metrics.performanceMetrics.onTimeDeliveries / metrics.totalDispatches) * 100).toFixed(1) : 0}% del total
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-600">Entregas Tardías</p>
                    <p className="text-3xl font-bold text-red-600">{metrics.performanceMetrics.lateDeliveries}</p>
                    <p className="text-xs text-gray-500">
                      {metrics.totalDispatches > 0 ? ((metrics.performanceMetrics.lateDeliveries / metrics.totalDispatches) * 100).toFixed(1) : 0}% del total
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-600">Tasa de Finalización</p>
                    <p className="text-3xl font-bold text-blue-600">{metrics.performanceMetrics.completionRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Despachos completados vs iniciados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabla de Despachos */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Detalle de Despachos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Fecha</th>
                        <th className="text-left p-2">Tipo Entrega</th>
                        <th className="text-left p-2">Sucursal</th>
                        <th className="text-left p-2">Vendedor</th>
                        <th className="text-left p-2">Cliente</th>
                        <th className="text-left p-2">Documento</th>
                        <th className="text-right p-2">Monto Neto sin Despacho</th>
                        <th className="text-left p-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.dispatchesTable?.slice(0, 20).map((dispatch) => (
                        <tr key={dispatch.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            {(() => {
                              // Evitar problemas de zona horaria
                              const dateStr = dispatch.fecha.includes('T') ? dispatch.fecha : dispatch.fecha.split(' ')[0] + 'T12:00:00';
                              return new Date(dateStr).toLocaleDateString('es-CL');
                            })()}
                          </td>
                          <td className="p-2">
                            <Badge variant="outline">
                              {dispatch.tipoEntrega === 'RETIRO_LOCAL' ? 'Retiro Local' :
                               dispatch.tipoEntrega === 'COURIER' ? 'Courier' : 'Despacho'}
                            </Badge>
                          </td>
                          <td className="p-2">{dispatch.sucursal}</td>
                          <td className="p-2">{dispatch.vendedor}</td>
                          <td className="p-2">{dispatch.cliente}</td>
                          <td className="p-2">{dispatch.documento}</td>
                          <td className="p-2 text-right font-medium">
                            ${dispatch.montoNetoSinDespacho.toLocaleString('es-CL')}
                          </td>
                          <td className="p-2">
                            <Badge 
                              variant={
                                dispatch.estado === 'DELIVERED' ? 'default' :
                                dispatch.estado === 'IN_TRANSIT' ? 'secondary' :
                                dispatch.estado === 'CANCELLED' ? 'destructive' :
                                'outline'
                              }
                            >
                              {dispatch.estado === 'PENDING' ? 'Pendiente' :
                               dispatch.estado === 'SCHEDULED' ? 'Programado' :
                               dispatch.estado === 'IN_TRANSIT' ? 'En Tránsito' :
                               dispatch.estado === 'DELIVERED' ? 'Entregado' :
                               'Cancelado'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {metrics.dispatchesTable && metrics.dispatchesTable.length > 20 && (
                    <div className="text-center p-4 text-gray-500">
                      Mostrando 20 de {metrics.dispatchesTable.length} despachos
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}