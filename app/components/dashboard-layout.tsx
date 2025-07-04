
'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Building, Users, LogOut, Settings, FileText, Bug, Calculator, CreditCard } from 'lucide-react';
import Link from 'next/link';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-card border-r">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b">
            <div className="flex items-center space-x-3">
              <div className="bg-primary rounded-lg p-2">
                <Building className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold">Sistema Gestión</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-6 space-y-2">
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            
            <Link href="/documentos">
              <Button variant="ghost" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Documentos ERP
              </Button>
            </Link>
            
            <Link href="/comisiones">
              <Button variant="ghost" className="w-full justify-start">
                <Calculator className="mr-2 h-4 w-4" />
                Comisiones
              </Button>
            </Link>
            
            {(session?.user as any)?.perfil === 'administrador' && (
              <>
                <Link href="/verificacion-pagos">
                  <Button variant="ghost" className="w-full justify-start">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Verificación de Pagos
                  </Button>
                </Link>
                <Link href="/admin/users">
                  <Button variant="ghost" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Gestión de Usuarios
                  </Button>
                </Link>
              </>
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
      <div className="ml-64">
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
