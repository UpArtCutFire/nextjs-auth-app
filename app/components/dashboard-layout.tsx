
'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Building, Users, LogOut, Settings, FileText, Bug, Calculator, CreditCard, CheckCircle, Menu, X, Truck, Calendar, Monitor, Scale, UserCheck, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['despachos', 'pagos', 'admin']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };


  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b z-50 flex items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        <div className="ml-4 flex items-center space-x-3">
          <div className="bg-primary rounded-lg p-2">
            <Building className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">Sistema Gestión</span>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-card border-r z-40 transform transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-primary rounded-lg p-2">
                  <Building className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-semibold">Sistema Gestión</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-6 space-y-1 overflow-y-auto">
            {/* Dashboard Principal */}
            <Link href="/dashboard" onClick={() => setIsSidebarOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            
            {/* Documentos y Comisiones */}
            <Link href="/documentos" onClick={() => setIsSidebarOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Documentos ERP
              </Button>
            </Link>
            
            <Link href="/comisiones" onClick={() => setIsSidebarOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                <Calculator className="mr-2 h-4 w-4" />
                Comisiones
              </Button>
            </Link>

            {/* Sección Despachos */}
            <div className="pt-2">
              <Button
                variant="ghost"
                className="w-full justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => toggleSection('despachos')}
              >
                <span className="flex items-center">
                  <Truck className="mr-2 h-4 w-4" />
                  Gestión de Despachos
                </span>
                {expandedSections.includes('despachos') ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </Button>
              
              {expandedSections.includes('despachos') && (
                <div className="ml-6 space-y-1 mt-1">
                  {(((session?.user as any)?.perfil === 'administrador') || session?.user?.email === 'john@doe.com' || session?.user?.email === 'admin@test.com') && (
                    <>
                      <Link href="/dashboard-despachos" onClick={() => setIsSidebarOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                          <BarChart3 className="mr-2 h-3 w-3" />
                          Dashboard
                        </Button>
                      </Link>
                      <Link href="/transportes" onClick={() => setIsSidebarOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                          <Truck className="mr-2 h-3 w-3" />
                          Transportes
                        </Button>
                      </Link>
                      <Link href="/sucursales" onClick={() => setIsSidebarOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                          <Building className="mr-2 h-3 w-3" />
                          Sucursales
                        </Button>
                      </Link>
                      <Link href="/plan-despachos" onClick={() => setIsSidebarOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                          <Calendar className="mr-2 h-3 w-3" />
                          Planificación
                        </Button>
                      </Link>
                      <Link href="/equivalencias-tallas" onClick={() => setIsSidebarOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                          <Scale className="mr-2 h-3 w-3" />
                          Equiv. Tallas
                        </Button>
                      </Link>
                    </>
                  )}
                  {/* Planificación también para planificadores */}
                  {((session?.user as any)?.perfil === 'planificador') && (
                    <Link href="/plan-despachos" onClick={() => setIsSidebarOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                        <Calendar className="mr-2 h-3 w-3" />
                        Planificación
                      </Button>
                    </Link>
                  )}
                  <Link href="/monitor-despachos" onClick={() => setIsSidebarOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                      <Monitor className="mr-2 h-3 w-3" />
                      Monitor
                    </Button>
                  </Link>
                  <Link href="/despachadores" onClick={() => setIsSidebarOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                      <UserCheck className="mr-2 h-3 w-3" />
                      Panel Despachador
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Sección Pagos */}
            {(((session?.user as any)?.perfil === 'administrador') || session?.user?.email === 'john@doe.com' || session?.user?.email === 'admin@test.com') && (
              <div className="pt-2">
                <Button
                  variant="ghost"
                  className="w-full justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSection('pagos')}
                >
                  <span className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Gestión de Pagos
                  </span>
                  {expandedSections.includes('pagos') ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </Button>
                
                {expandedSections.includes('pagos') && (
                  <div className="ml-6 space-y-1 mt-1">
                    <Link href="/verificacion-pagos" onClick={() => setIsSidebarOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                        <CreditCard className="mr-2 h-3 w-3" />
                        Verificación
                      </Button>
                    </Link>
                    <Link href="/admin/verificaciones" onClick={() => setIsSidebarOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                        <CheckCircle className="mr-2 h-3 w-3" />
                        Aprobación
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Sección Administración */}
            {(((session?.user as any)?.perfil === 'administrador') || session?.user?.email === 'john@doe.com' || session?.user?.email === 'admin@test.com') && (
              <div className="pt-2">
                <Button
                  variant="ghost"
                  className="w-full justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSection('admin')}
                >
                  <span className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    Administración
                  </span>
                  {expandedSections.includes('admin') ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </Button>
                
                {expandedSections.includes('admin') && (
                  <div className="ml-6 space-y-1 mt-1">
                    <Link href="/admin/users" onClick={() => setIsSidebarOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                        <Users className="mr-2 h-3 w-3" />
                        Usuarios
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="p-6 border-t">
            <Card className="p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                <p className="text-xs capitalize bg-primary/10 text-primary px-2 py-1 rounded">
                  {(session?.user as any)?.perfil}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 pt-16 lg:pt-0">
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
      
    </div>
  );
}
