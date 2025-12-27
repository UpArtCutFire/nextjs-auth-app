
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Users, UserCheck, ShoppingCart, TrendingUp, FileText, DollarSign, Clock, RefreshCw, Loader2, CheckCircle, AlertTriangle, BarChart3, Target } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

// Componentes para métricas del vendedor
import { MetricCard } from '@/components/ui/metric-card';
import { ProgressGauge } from '@/components/ui/progress-gauge';
import { MonthSelector } from '@/components/ui/month-selector';
import { SalesBarChart } from '@/components/ui/sales-bar-chart';
import { DistributionPieChart } from '@/components/ui/distribution-pie-chart';
import { InfoCard, BestMonthCard } from '@/components/ui/info-card';
import { VendorMetrics, VendorInfo } from '@/lib/types';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalVendedores: number;
}

interface CotizacionesStats {
  totalCotizaciones: number;
  montoTotal: number;
  cotizacionesPendientes: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalVendedores: 0,
  });
  const [cotizacionesStats, setCotizacionesStats] = useState<CotizacionesStats>({
    totalCotizaciones: 0,
    montoTotal: 0,
    cotizacionesPendientes: 0,
  });
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loadingCotizaciones, setLoadingCotizaciones] = useState(false);
  const [errorCotizaciones, setErrorCotizaciones] = useState<string | null>(null);
  const [ciSession, setCiSession] = useState<string | null>(null);

  // Estado para las credenciales ERP
  const [erpCredentials, setErpCredentials] = useState<{
    txtrutempresa: string;
    txtusuario: string;
    txtpwd: string;
  } | null>(null);

  // Estados para métricas del vendedor
  const [vendorMetrics, setVendorMetrics] = useState<VendorMetrics | null>(null);
  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loadingVendorMetrics, setLoadingVendorMetrics] = useState(false);
  const [vendorMetricsError, setVendorMetricsError] = useState<string | null>(null);

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
      setErrorCotizaciones('Error obteniendo credenciales ERP');
      return null;
    }
  };

  // Función para autenticar con ERP (copiada exactamente de documentos)
  const authenticateERP = async () => {
    try {
      setLoadingCotizaciones(true);
      setErrorCotizaciones(null);

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
        credentials: 'include',
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
        credentials: 'include',
        body: JSON.stringify({ redirectUrl: authData.redirectUrl }),
      });

      const sessionData = await sessionResponse.json();
      
      if (!sessionData.success) {
        throw new Error(sessionData.error || 'Error obteniendo sesión');
      }

      setCiSession(sessionData.ci_session);
      
      // Cargar estadísticas de cotizaciones automáticamente después de autenticar
      await loadCotizacionesStats(sessionData.ci_session);
      
    } catch (error) {
      console.error('Error autenticando ERP:', error);
      setErrorCotizaciones(error instanceof Error ? error.message : 'Error de autenticación');
    } finally {
      setLoadingCotizaciones(false);
    }
  };

  // Función para cargar estadísticas de cotizaciones (copiada la estructura de loadDocuments)
  const loadCotizacionesStats = async (sessionId?: string) => {
    try {
      setLoadingCotizaciones(true);
      setErrorCotizaciones(null);
      
      const sessionToUse = sessionId || ciSession;
      if (!sessionToUse) {
        throw new Error('Sesión ERP no disponible');
      }

      const response = await fetch('/api/dashboard/cotizaciones-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ci_session: sessionToUse
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error cargando estadísticas');
      }

      setCotizacionesStats(data.stats || {
        totalCotizaciones: 0,
        montoTotal: 0,
        cotizacionesPendientes: 0
      });
      
    } catch (error) {
      console.error('Error cargando estadísticas de cotizaciones:', error);
      setErrorCotizaciones(error instanceof Error ? error.message : 'Error cargando estadísticas');
    } finally {
      setLoadingCotizaciones(false);
    }
  };

  // Función para cargar métricas del vendedor
  const loadVendorMetrics = async (month?: string) => {
    try {
      setLoadingVendorMetrics(true);
      setVendorMetricsError(null);

      const monthToUse = month || selectedMonth;

      const response = await fetch('/api/dashboard/vendor-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ month: monthToUse }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error cargando métricas');
      }

      setVendorMetrics(data.metrics);
      setVendorInfo(data.vendorInfo);

    } catch (error) {
      console.error('Error cargando métricas del vendedor:', error);
      setVendorMetricsError(error instanceof Error ? error.message : 'Error cargando métricas');
      toast.error('Error al cargar métricas de ventas');
    } finally {
      setLoadingVendorMetrics(false);
    }
  };

  // Manejar cambio de mes
  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    loadVendorMetrics(newMonth);
  };

  // Formatear moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if ((session?.user as any)?.perfil === 'administrador') {
          // Cargar estadísticas generales
          const response = await fetch('/api/dashboard/stats', {
            credentials: 'include'
          });
          if (response.ok) {
            const data = await response.json();
            setStats(data);
          }

          // Iniciar autenticación ERP automáticamente para estadísticas de cotizaciones
          await authenticateERP();
        } else {
          // Cargar info de usuario para vendedores
          const response = await fetch('/api/dashboard/user-info', {
            credentials: 'include'
          });
          if (response.ok) {
            const data = await response.json();
            setUserInfo(data);
          }

          // Cargar métricas del vendedor
          await loadVendorMetrics();
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    if (session) {
      fetchData();
    }
  }, [session]);

  const isAdmin = (session?.user as any)?.perfil === 'administrador';

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold">
            Hola, {session?.user?.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            Bienvenido a tu panel de control
          </p>
        </div>

        {isAdmin ? (
          // Admin Dashboard
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats?.activeUsers ?? 0}</div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vendedores</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats?.totalVendedores ?? 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Estadísticas de Cotizaciones */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Estadísticas de Cotizaciones - Mes Actual</h2>
                <div className="flex items-center gap-2">
                  {ciSession && (
                    <Button 
                      onClick={() => loadCotizacionesStats()}
                      disabled={loadingCotizaciones}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {loadingCotizaciones ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Actualizar
                    </Button>
                  )}
                  {loadingCotizaciones && (
                    <div className="text-sm text-muted-foreground">Cargando...</div>
                  )}
                </div>
              </div>
              
              {errorCotizaciones ? (
                <Card className="border-destructive">
                  <CardContent className="pt-6">
                    <div className="text-center text-destructive space-y-2">
                      <Clock className="mx-auto h-8 w-8 mb-2" />
                      <p className="text-sm">{errorCotizaciones}</p>
                      <Button 
                        onClick={authenticateERP}
                        disabled={loadingCotizaciones}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        {loadingCotizaciones ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Reconectar ERP
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="hover:shadow-md transition-shadow border-orange-200 bg-orange-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Cotizaciones</CardTitle>
                      <FileText className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-700">
                        {loadingCotizaciones ? '--' : cotizacionesStats.totalCotizaciones}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cotizaciones del mes
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow border-green-200 bg-green-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-700">
                        {loadingCotizaciones ? '--' : `$${cotizacionesStats.montoTotal.toLocaleString('es-CL')}`}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Valor en pesos chilenos
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow border-amber-200 bg-amber-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Cotizaciones Pendientes</CardTitle>
                      <Clock className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-amber-700">
                        {loadingCotizaciones ? '--' : cotizacionesStats.cotizacionesPendientes}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requieren seguimiento
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href="/admin/users">
                  <Button className="w-full sm:w-auto">
                    <Users className="mr-2 h-4 w-4" />
                    Administrar Usuarios
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Vendedor Dashboard
          <div className="space-y-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Mi Perfil de Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userInfo && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Código de Vendedor</p>
                      <p className="text-lg font-semibold">{userInfo.codigo_vendedor || 'No asignado'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Porcentaje de Comisión</p>
                      <p className="text-lg font-semibold text-green-600">
                        {userInfo.porcentaje_comision ? `${userInfo.porcentaje_comision}%` : 'No definido'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Comisión Base</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {userInfo.comision_base ? `$${userInfo.comision_base.toLocaleString()}` : 'No definida'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Header de Métricas */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                <h2 className="text-2xl font-bold">Métricas de Ventas</h2>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded font-medium">
                  MÉTRICAS MES ACTUAL DEL VENDEDOR // CON FILTRO POR MES
                </span>
                <MonthSelector
                  selectedMonth={selectedMonth}
                  onChange={handleMonthChange}
                />
              </div>
            </div>

            {/* Error de métricas */}
            {vendorMetricsError && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    <p className="text-sm">{vendorMetricsError}</p>
                    <Button
                      onClick={() => loadVendorMetrics()}
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reintentar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 4 Cards de KPIs principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="CT/NV Pendientes"
                value={vendorMetrics?.currentMonth.totalDocuments ?? '--'}
                subtitle="Documentos para facturar"
                icon={<FileText className="h-5 w-5 text-orange-600" />}
                iconBgColor="bg-orange-100"
                isLoading={loadingVendorMetrics}
              />

              <MetricCard
                title="Pagos Verificados"
                value={vendorMetrics?.currentMonth.verifiedDocuments ?? '--'}
                subtitle="Listos para facturar"
                icon={<CheckCircle className="h-5 w-5 text-green-600" />}
                iconBgColor="bg-green-100"
                isLoading={loadingVendorMetrics}
              />

              <MetricCard
                title="Sin Verificar ⚠️"
                value={vendorMetrics?.currentMonth.pendingDocuments ?? '--'}
                subtitle="Pendientes de verificar"
                icon={<AlertTriangle className="h-5 w-5 text-orange-700" />}
                alertBg={true}
                isLoading={loadingVendorMetrics}
              />

              <ProgressGauge
                percentage={vendorMetrics?.currentMonth.progressPercentage ?? 0}
                title="Progreso Cierre"
                subtitle="Completado"
                isLoading={loadingVendorMetrics}
              />
            </div>

            {/* Fila de Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <SalesBarChart
                data={vendorMetrics?.monthlyComparison ?? []}
                title="Comparativo Últimos 3 Meses"
                isLoading={loadingVendorMetrics}
              />

              <DistributionPieChart
                data={vendorMetrics?.documentDistribution ?? []}
                title="Distribución Documentos"
                isLoading={loadingVendorMetrics}
              />

              <BestMonthCard
                bestMonthLabel={vendorMetrics?.bestMonth.monthLabel ?? '--'}
                bestMonthAmount={vendorMetrics?.bestMonth.grossSales ?? 0}
                currentMonthLabel={vendorMetrics?.monthComparison.currentMonth.label ?? '--'}
                currentMonthAmount={vendorMetrics?.currentMonth.grossSales ?? 0}
                isLoading={loadingVendorMetrics}
              />
            </div>

            {/* Fila de Cards Informativas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <InfoCard
                title="Comisiones Últimos 6 Meses"
                icon={<DollarSign className="h-4 w-4" />}
                variant="blue"
                isLoading={loadingVendorMetrics}
                items={
                  vendorMetrics?.commissionsHistory.slice(-6).map(c => ({
                    label: c.monthLabel,
                    value: c.commission
                  })) ?? []
                }
              />

              <InfoCard
                title="Documentos del Mes"
                icon={<FileText className="h-4 w-4" />}
                variant="blue"
                isLoading={loadingVendorMetrics}
                items={[
                  {
                    label: 'Total Emitidos',
                    value: vendorMetrics?.currentMonth.totalDocuments ?? 0
                  },
                  {
                    label: 'Verificados',
                    value: vendorMetrics?.currentMonth.verifiedDocuments ?? 0
                  },
                  {
                    label: 'Tasa de Cierre',
                    value: `${vendorMetrics?.currentMonth.progressPercentage ?? 0}%`,
                    highlight: true
                  }
                ]}
              />

              <InfoCard
                title="Meta Mensual"
                icon={<Target className="h-4 w-4" />}
                variant="blue"
                isLoading={loadingVendorMetrics}
                items={[
                  {
                    label: vendorMetrics?.monthComparison.previousMonth.label ?? 'Mes Anterior',
                    value: vendorMetrics?.monthComparison.previousMonth.commission ?? 0
                  },
                  {
                    label: vendorMetrics?.monthComparison.currentMonth.label ?? 'Mes Actual',
                    value: vendorMetrics?.monthComparison.currentMonth.commission ?? 0,
                    highlight: true
                  }
                ]}
              />

              <InfoCard
                title="Mejor Mes del Año"
                icon={<BarChart3 className="h-4 w-4" />}
                variant="green"
                isLoading={loadingVendorMetrics}
                items={[
                  {
                    label: vendorMetrics?.bestMonth.monthLabel ?? '--',
                    value: vendorMetrics?.bestMonth.grossSales ?? 0,
                    highlight: true
                  },
                  {
                    label: 'Comisión',
                    value: vendorMetrics?.bestMonth.commission ?? 0
                  }
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
