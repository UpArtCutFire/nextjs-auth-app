
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Eye, 
  User, 
  Calendar, 
  CreditCard, 
  FileText, 
  MessageSquare, 
  Image as ImageIcon,
  Receipt,
  DollarSign,
  Hash,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface PaymentVerificationDetail {
  id: string;
  documentNumber: string;
  documentType: string;
  vendorCode: string;
  paymentMethod: 'efectivo' | 'transferencia' | 'webpay' | 'flete';
  amount?: number;
  comment: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
  documentInfo?: {
    cliente?: string;
    monto?: string;
    fecha?: string;
    vendedor?: string;
    targetType?: string;
  };
  registeredBy: {
    id: string;
    nombre: string;
    correo: string;
    codigoVendedor?: string;
  };
}

interface PaymentDetailModalProps {
  documentNumber: string;
  documentType: string;
  children: React.ReactNode;
}

const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'efectivo': return 'Efectivo';
    case 'transferencia': return 'Transferencia';
    case 'webpay': return 'WebPay';
    case 'flete': return 'Monto Flete';
    default: return method;
  }
};

const getPaymentMethodIcon = (method: string) => {
  switch (method) {
    case 'efectivo': return <DollarSign className="h-4 w-4" />;
    case 'transferencia': return <CreditCard className="h-4 w-4" />;
    case 'webpay': return <CreditCard className="h-4 w-4" />;
    case 'flete': return <span className="text-base">🚚</span>;
    default: return <CreditCard className="h-4 w-4" />;
  }
};

const getPaymentMethodColor = (method: string) => {
  switch (method) {
    case 'efectivo': return 'bg-green-100 text-green-800';
    case 'transferencia': return 'bg-blue-100 text-blue-800';
    case 'webpay': return 'bg-purple-100 text-purple-800';
    case 'flete': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const formatCurrency = (amount: string | number) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(numAmount || 0);
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function PaymentDetailModal({ documentNumber, documentType, children }: PaymentDetailModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentVerificationDetail[]>([]);
  const [imageViewOpen, setImageViewOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchPaymentDetail = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        documentNumber,
        documentType
      });

      const response = await fetch(`/api/payment-verification/details?${params}`);
      
      if (!response.ok) {
        throw new Error('Error al obtener detalles del pago');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error en respuesta del servidor');
      }

      // La API ahora devuelve paymentVerifications (plural) con todos los pagos
      setPaymentDetails(data.paymentVerifications || [data.paymentVerification]);
      
    } catch (error) {
      console.error('Error obteniendo detalles:', error);
      toast.error('Error al cargar detalles del pago');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && paymentDetails.length === 0) {
      fetchPaymentDetail();
    }
    if (!newOpen) {
      setPaymentDetails([]);
      setSelectedImage(null);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'CT': return 'Cotización';
      case 'NV': return 'Nota de Venta';
      default: return type;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Detalle de Verificación de Pago
          </DialogTitle>
          <DialogDescription>
            Información completa del pago registrado por el vendedor
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Cargando detalles...</span>
          </div>
        ) : paymentDetails.length > 0 ? (
          <div className="space-y-6">
            
            {/* Información del Documento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Receipt className="h-5 w-5" />
                  Información del Documento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Documento Origen</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        {getDocumentTypeLabel(paymentDetails[0].documentType)} {paymentDetails[0].documentNumber}
                      </Badge>
                    </div>
                  </div>
                  {paymentDetails[0].documentInfo?.targetType && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Generará</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="default" className="bg-blue-100 text-blue-800">
                          {paymentDetails[0].documentInfo.targetType}
                        </Badge>
                      </div>
                    </div>
                  )}
                  {paymentDetails[0].documentInfo?.cliente && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                      <p className="text-sm font-medium mt-1">{paymentDetails[0].documentInfo.cliente}</p>
                    </div>
                  )}
                  {paymentDetails[0].documentInfo?.monto && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Monto Total</Label>
                      <p className="text-sm font-semibold text-green-600 mt-1">
                        {formatCurrency(paymentDetails[0].documentInfo.monto)}
                      </p>
                    </div>
                  )}
                  {paymentDetails[0].documentInfo?.fecha && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Fecha Documento</Label>
                      <p className="text-sm mt-1">
                        {new Date(paymentDetails[0].documentInfo.fecha).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Código Vendedor</Label>
                    <p className="text-sm mt-1">{paymentDetails[0].vendorCode}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información de los Pagos */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pagos Registrados ({paymentDetails.length})
              </h3>
              
              {/* Resumen de totales por método de pago */}
              {paymentDetails.length > 1 && (
                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Resumen de Pagos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {Object.entries(
                        paymentDetails.reduce((acc, payment) => {
                          const method = payment.paymentMethod;
                          acc[method] = (acc[method] || 0) + (payment.amount || 0);
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([method, total]) => (
                        <div key={method} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={getPaymentMethodColor(method) + ' text-xs'}>
                              {getPaymentMethodIcon(method)}
                              <span className="ml-1">{getPaymentMethodLabel(method)}</span>
                            </Badge>
                          </div>
                          <span className="font-semibold">{formatCurrency(total)}</span>
                        </div>
                      ))}
                    </div>
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between font-semibold">
                      <span>Total Verificado:</span>
                      <span className="text-green-600">
                        {formatCurrency(paymentDetails.reduce((acc, p) => acc + (p.amount || 0), 0))}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Lista de pagos individuales */}
              {paymentDetails.map((payment, index) => (
                <Card key={payment.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        Pago #{index + 1}
                        {payment.paymentMethod === 'flete' && (
                          <Badge variant="outline" className="text-xs">
                            ⚠️ Excluido de comisiones
                          </Badge>
                        )}
                      </span>
                      <Badge className={getPaymentMethodColor(payment.paymentMethod)}>
                        {getPaymentMethodIcon(payment.paymentMethod)}
                        <span className="ml-1">{getPaymentMethodLabel(payment.paymentMethod)}</span>
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {payment.amount && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {payment.paymentMethod === 'flete' ? 'Monto del Flete' : 'Monto Verificado'}
                        </Label>
                        <p className="text-lg font-semibold text-green-600 mt-1">
                          {formatCurrency(payment.amount)}
                        </p>
                      </div>
                    )}

                    {payment.comment && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          Comentarios
                        </Label>
                        <div className="mt-1 p-3 bg-muted rounded-md">
                          <p className="text-sm">{payment.comment}</p>
                        </div>
                      </div>
                    )}

                    {payment.photoUrl && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <ImageIcon className="h-4 w-4" />
                          Comprobante de Pago
                        </Label>
                        <div className="mt-2">
                          <div 
                            className="relative w-full h-48 bg-muted rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setSelectedImage(payment.photoUrl!);
                              setImageViewOpen(true);
                            }}
                          >
                            <Image
                              src={payment.photoUrl}
                              alt="Comprobante de pago"
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-10 transition-all">
                              <div className="bg-white bg-opacity-90 p-2 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                                <Eye className="h-5 w-5" />
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              setSelectedImage(payment.photoUrl!);
                              setImageViewOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver en tamaño completo
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Información del registro */}
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(payment.registeredBy.nombre)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{payment.registeredBy.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(payment.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>


          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No se pudieron cargar los detalles del pago</p>
          </div>
        )}

        {/* Modal para ver imagen en tamaño completo */}
        {selectedImage && (
          <Dialog open={imageViewOpen} onOpenChange={setImageViewOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Comprobante de Pago</DialogTitle>
                <DialogDescription>
                  {getDocumentTypeLabel(paymentDetails[0]?.documentType)} {paymentDetails[0]?.documentNumber}
                </DialogDescription>
              </DialogHeader>
              <div className="relative w-full h-[60vh]">
                <Image
                  src={selectedImage}
                  alt="Comprobante de pago"
                  fill
                  className="object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper component for labels
function Label({ children, className = "", ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) {
  return (
    <label className={`text-sm font-medium ${className}`} {...props}>
      {children}
    </label>
  );
}
