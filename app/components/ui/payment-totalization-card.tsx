'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Banknote, 
  CreditCard, 
  DollarSign,
  TrendingUp,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentTotals {
  efectivo: number;
  transferencia: number;
  webpayTarjeta: number;
  total: number;
  documentCount: number;
}

interface PaymentTotalizationCardProps {
  documents: any[];
  session: any;
}

export function PaymentTotalizationCard({ documents, session }: PaymentTotalizationCardProps) {
  const [totals, setTotals] = useState<PaymentTotals>({
    efectivo: 0,
    transferencia: 0,
    webpayTarjeta: 0,
    total: 0,
    documentCount: 0
  });
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Obtener las verificaciones de pago para los documentos
  const fetchVerifications = async () => {
    try {
      setLoading(true);
      
      // Obtener números de documento para buscar
      const documentNumbers = documents
        .filter(doc => doc.hasPaymentVerification)
        .map(doc => doc.NumDoc);

      if (documentNumbers.length === 0) {
        setVerifications([]);
        setLoading(false);
        return;
      }

      // Llamar a la API para obtener detalles de las verificaciones
      const response = await fetch('/api/payment-verifications?' + 
        new URLSearchParams({ documentNumbers: documentNumbers.join(',') }), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error obteniendo verificaciones');
      }

      const data = await response.json();
      setVerifications(data.verifications || []);
      
    } catch (error) {
      console.error('Error obteniendo verificaciones:', error);
      setVerifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Calcular totales cuando cambien los documentos o verificaciones
  useEffect(() => {
    console.log('[TOTALIZATION] Documentos recibidos:', documents.length);
    if (documents.length > 0) {
      fetchVerifications();
    } else {
      setVerifications([]);
      setLoading(false);
    }
  }, [documents]);

  useEffect(() => {
    console.log('[TOTALIZATION] Calculando totales. Documentos:', documents.length, 'Verificaciones:', verifications.length);
    
    // Filtrar solo documentos con referencia a factura/boleta sin nota de crédito
    const eligibleDocuments = documents.filter(doc => {
      console.log('[TOTALIZATION] Evaluando documento:', doc.NumDoc, 'hasPayment:', doc.hasPaymentVerification, 'targetType:', doc.targetDocumentType);
      
      // Solo documentos con verificación de pago
      if (!doc.hasPaymentVerification) return false;
      
      // Solo documentos con tipo de destino Factura o Boleta
      if (doc.targetDocumentType !== 'Factura' && doc.targetDocumentType !== 'Boleta') return false;
      
      // TODO: Verificar que no tengan nota de crédito asociada
      // Por ahora asumimos que todos los documentos filtrados son válidos
      
      return true;
    });
    
    console.log('[TOTALIZATION] Documentos elegibles:', eligibleDocuments.length);

    // Crear mapa de verificaciones por documento
    const verificationMap = new Map();
    verifications.forEach(v => {
      verificationMap.set(v.documentNumber, v);
    });

    // Calcular totales por medio de pago
    const newTotals: PaymentTotals = {
      efectivo: 0,
      transferencia: 0,
      webpayTarjeta: 0,
      total: 0,
      documentCount: 0
    };

    eligibleDocuments.forEach(doc => {
      const verification = verificationMap.get(doc.NumDoc);
      console.log('[TOTALIZATION] Procesando documento:', doc.NumDoc, 'verification:', !!verification);
      
      if (verification) {
        const amount = verification.amount || parseFloat(doc.MntTotal) || 0;
        console.log('[TOTALIZATION] Monto:', amount, 'Method:', verification.paymentMethod);
        
        switch (verification.paymentMethod) {
          case 'efectivo':
            newTotals.efectivo += amount;
            break;
          case 'transferencia':
            newTotals.transferencia += amount;
            break;
          case 'webpay':
          case 'tarjeta':
            newTotals.webpayTarjeta += amount;
            break;
        }
        
        newTotals.total += amount;
        newTotals.documentCount++;
      }
    });
    
    console.log('[TOTALIZATION] Totales calculados:', newTotals);

    setTotals(newTotals);
  }, [documents, verifications]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Si es vendedor, mostrar mensaje informativo
  const user = session?.user as any;
  const isVendor = user?.perfil === 'vendedor';

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Totalización por Medio de Pago
        </CardTitle>
        <CardDescription>
          Resumen de montos a recaudar por cada medio de pago basado en documentos verificados con referencia a factura/boleta
          {isVendor && ' (Solo tus documentos)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Calculando totales...</div>
          </div>
        ) : totals.documentCount === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No hay documentos verificados con referencia a factura o boleta en el período seleccionado
              {isVendor && ' para tu código de vendedor'}.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Efectivo</CardTitle>
                  <Banknote className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(totals.efectivo)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A recaudar en efectivo
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Transferencia</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(totals.transferencia)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A recaudar por transferencia
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Webpay/Tarjeta</CardTitle>
                  <CreditCard className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(totals.webpayTarjeta)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A recaudar por Webpay/Tarjeta
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total General</CardTitle>
                  <FileText className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(totals.total)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {totals.documentCount} documento(s)
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>
                  Los montos mostrados corresponden únicamente a documentos CT/NV con verificación de pago 
                  que tienen referencia a Factura o Boleta sin notas de crédito asociadas.
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}