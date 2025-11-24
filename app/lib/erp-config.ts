import { prisma } from '@/lib/db';

export interface ERPCredentials {
  txtrutempresa: string;
  txtusuario: string;
  txtpwd: string;
}

// Credenciales por defecto (las actuales hardcodeadas)
const DEFAULT_CREDENTIALS: ERPCredentials = {
  txtrutempresa: '77261114-5',
  txtusuario: '18221084-6',
  txtpwd: 'Rguz0608'
};

export async function getERPCredentials(): Promise<ERPCredentials> {
  try {
    // Intentar obtener las credenciales de la base de datos
    const config = await prisma.eRPConfig.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        txtrutempresa: true,
        txtusuario: true,
        txtpwd: true,
      }
    });

    if (config) {
      return config;
    }
  } catch (error) {
    console.error('Error obteniendo credenciales ERP de la base de datos:', error);
  }

  // Si no hay configuración en la base de datos o hay error, usar las credenciales por defecto
  return DEFAULT_CREDENTIALS;
}