import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getERPCredentials } from '@/lib/erp-config';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const credentials = await getERPCredentials();
    
    return NextResponse.json(credentials);
  } catch (error) {
    console.error('Error fetching ERP credentials:', error);
    return NextResponse.json(
      { error: 'Error al obtener credenciales' },
      { status: 500 }
    );
  }
}