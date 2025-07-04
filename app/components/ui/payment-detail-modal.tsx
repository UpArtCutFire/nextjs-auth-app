
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
  paymentMethod: 'efectivo' | 'transferencia' | 'webpay';
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
    default: return method;
  }
};

const getPaymentMethodIcon = (method: string) => {
  switch (method) {
    case 'efectivo': return <DollarSign className="h-4 w-4" />;
    case 'transferencia': return <CreditCard className="h-4 w-4" />;
    case 'webpay': return <CreditCard className="h-4 w-4" />;
    default: return <CreditCard className="h-4 w-4" />;
  }
};

const getPaymentMethodColor = (method: string) => {
  switch (method) {
    case 'efectivo': return 'bg-green-100 text-green-800';
    case 'transferencia': return 'bg-blue-100 text-blue-800';
    case 'webpay': return 'bg-purple-100 text-purple-800';
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
  const [paymentDetail, setPaymentDetail] = useState<PaymentVerificationDetail | null>(null);
  const [imageViewOpen, setImageViewOpen] = useState(false);

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

      setPaymentDetail(data.paymentVerification);
      
    } catch (error) {
      console.error('Error obteniendo detalles:', error);
      toast.error('Error al cargar detalles del pago');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && !paymentDetail) {
      fetchPaymentDetail();
    }
    if (!newOpen) {
      setPaymentDetail(null);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
        ) : paymentDetail ? (
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Documento Origen</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        {getDocumentTypeLabel(paymentDetail.documentType)} {paymentDetail.documentNumber}
                      </Badge>
                    </div>
                  </div>
                  {paymentDetail.documentInfo?.targetType && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Generará</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="default" className="bg-blue-100 text-blue-800">
                          {paymentDetail.documentInfo.targetType}
                        </Badge>
                      </div>
                    </div>
                  )}
                  {paymentDetail.documentInfo?.cliente && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                      <p className="text-sm font-medium mt-1">{paymentDetail.documentInfo.cliente}</p>
                    </div>
                  )}
                  {paymentDetail.documentInfo?.monto && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Monto Total</Label>
                      <p className="text-sm font-semibold text-green-600 mt-1">
                        {formatCurrency(paymentDetail.documentInfo.monto)}
                      </p>
                    </div>
                  )}
                  {paymentDetail.documentInfo?.fecha && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Fecha Documento</Label>
                      <p className="text-sm mt-1">
                        {new Date(paymentDetail.documentInfo.fecha).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Código Vendedor</Label>
                    <p className="text-sm mt-1">{paymentDetail.vendorCode}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información del Pago */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5" />
                  Información del Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Método de Pago</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getPaymentMethodColor(paymentDetail.paymentMethod)}>
                      {getPaymentMethodIcon(paymentDetail.paymentMethod)}
                      <span className="ml-1">{getPaymentMethodLabel(paymentDetail.paymentMethod)}</span>
                    </Badge>
                  </div>
                </div>

                {paymentDetail.comment && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      Comentarios del Vendedor
                    </Label>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      <p className="text-sm">{paymentDetail.comment}</p>
                    </div>
                  </div>
                )}

                {paymentDetail.photoUrl && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="h-4 w-4" />
                      Comprobante de Pago
                    </Label>
                    <div className="mt-2">
                      <div 
                        className="relative w-full h-48 bg-muted rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setImageViewOpen(true)}
                      >
                        <Image
                          src={paymentDetail.photoUrl}
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
                        onClick={() => setImageViewOpen(true)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver en tamaño completo
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Información del Registro */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Información del Registro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {getInitials(paymentDetail.registeredBy.nombre)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{paymentDetail.registeredBy.nombre}</p>
                    <p className="text-sm text-muted-foreground">{paymentDetail.registeredBy.correo}</p>
                    {paymentDetail.registeredBy.codigoVendedor && (
                      <p className="text-xs text-muted-foreground">
                        Código: {paymentDetail.registeredBy.codigoVendedor}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Fecha de Registro
                    </Label>
                    <p className="font-medium mt-1">{formatDateTime(paymentDetail.createdAt)}</p>
                  </div>
                  {paymentDetail.updatedAt !== paymentDetail.createdAt && (
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Última Actualización
                      </Label>
                      <p className="font-medium mt-1">{formatDateTime(paymentDetail.updatedAt)}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    Pago verificado y listo para facturación
                  </span>
                </div>
              </CardContent>
            </Card>

          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No se pudieron cargar los detalles del pago</p>
          </div>
        )}

        {/* Modal para ver imagen en tamaño completo */}
        {paymentDetail?.photoUrl && (
          <Dialog open={imageViewOpen} onOpenChange={setImageViewOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Comprobante de Pago</DialogTitle>
                <DialogDescription>
                  {getDocumentTypeLabel(paymentDetail.documentType)} {paymentDetail.documentNumber}
                </DialogDescription>
              </DialogHeader>
              <div className="relative w-full h-[60vh]">
                <Image
                  src={paymentDetail.photoUrl}
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
