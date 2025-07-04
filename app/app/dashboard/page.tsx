
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Users, UserCheck, ShoppingCart, TrendingUp, FileText, DollarSign, Clock, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

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

  // Credenciales ERP (replicando exactamente la lógica de documentos)
  const erpCredentials = {
    txtrutempresa: '77261114-5',
    txtusuario: '18221084-6',
    txtpwd: 'Rguz0608'
  };

  // Función para autenticar con ERP (copiada exactamente de documentos)
  const authenticateERP = async () => {
    try {
      setLoadingCotizaciones(true);
      setErrorCotizaciones(null);

      // Paso 1: Autenticación inicial
      const authResponse = await fetch('/api/erp/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(erpCredentials),
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        if ((session?.user as any)?.perfil === 'administrador') {
          // Cargar estadísticas generales
          const response = await fetch('/api/dashboard/stats');
          if (response.ok) {
            const data = await response.json();
            setStats(data);
          }

          // Iniciar autenticación ERP automáticamente para estadísticas de cotizaciones
          await authenticateERP();
        } else {
          const response = await fetch('/api/dashboard/user-info');
          if (response.ok) {
            const data = await response.json();
            setUserInfo(data);
          }
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

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Métricas de Ventas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg mb-2">Próximamente</p>
                  <p className="text-sm">
                    Las métricas de ventas estarán disponibles cuando se conecte con la API externa.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
