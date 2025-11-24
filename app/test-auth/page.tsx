'use client';

import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/dashboard-layout';

export default function TestAuthPage() {
  const { data: session } = useSession();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Test Authentication</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Test Users</h2>
            <div className="space-y-2 text-sm">
              <p><strong>Admin:</strong> admin@test.com / admin123</p>
              <p><strong>Vendor:</strong> vendor@test.com / vendor123</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Current Session</h2>
            {session ? (
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> {session.user?.email}</p>
                <p><strong>Name:</strong> {session.user?.name}</p>
                <p><strong>Perfil:</strong> {(session.user as any)?.perfil}</p>
                <p><strong>Código Vendedor:</strong> {(session.user as any)?.codigo_vendedor || 'N/A'}</p>
                <p><strong>Is Admin:</strong> {(session.user as any)?.perfil === 'administrador' ? 'Yes' : 'No'}</p>
              </div>
            ) : (
              <p className="text-gray-500">No session found</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}