'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  DollarSign,
  Calendar,
  User,
  FileText,
  CreditCard,
  Banknote,
  Smartphone,
  Image as ImageIcon,
  ExternalLink,
  Loader2
} from 'lucide-react';

interface PaymentApprovalModalProps {
  verificationId: string;
  documentNumber: string;
  documentType: string;
  amount?: number;
  paymentMethod: string;
  photoUrl?: string;
  comment: string;
  vendorName: string;
  createdAt: string;
  status: string;
  onStatusChange: () => void;
  children: React.ReactNode;
}

export function PaymentApprovalModal({
  verificationId,
  documentNumber,
  documentType,
  amount,
  paymentMethod,
  photoUrl,
  comment,
  vendorName,
  createdAt,
  status,
  onStatusChange,
  children
}: PaymentApprovalModalProps) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleAction = async () => {
    if (!action) return;
    
    if (action === 'reject' && !rejectionReason.trim()) {
      toast.error('Debe proporcionar una razón para rechazar el pago');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/payment-verifications/${verificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setOpen(false);
        onStatusChange();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al procesar la acción');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar la acción');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL');
  };

  const getPaymentMethodIcon = () => {
    switch (paymentMethod) {
      case 'efectivo':
        return <Banknote className="h-4 w-4" />;
      case 'transferencia':
        return <CreditCard className="h-4 w-4" />;
      case 'webpay':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = () => {
    switch (paymentMethod) {
      case 'efectivo':
        return 'Efectivo';
      case 'transferencia':
        return 'Transferencia';
      case 'webpay':
        return 'Webpay';
      default:
        return paymentMethod;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Aprobar/Rechazar Verificación de Pago
          </DialogTitle>
          <DialogDescription>
            Revise los detalles del pago y tome una decisión
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Información del documento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Documento</Label>
              <div className="flex items-center gap-2 mt-1">
                <FileText className="h-4 w-4" />
                <span className="font-medium">
                  {documentType === 'CT' ? 'Cotización' : 'Nota de Venta'} {documentNumber}
                </span>
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Vendedor</Label>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4" />
                <span className="font-medium">{vendorName}</span>
              </div>
            </div>
          </div>

          {/* Monto y método de pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Monto</Label>
              <div className="flex items-center gap-2 mt-1">
                <DollarSign className="h-4 w-4" />
                <span className="font-medium text-lg">
                  {amount ? formatCurrency(amount) : 'No especificado'}
                </span>
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Método de Pago</Label>
              <div className="flex items-center gap-2 mt-1">
                {getPaymentMethodIcon()}
                <Badge variant="outline">{getPaymentMethodLabel()}</Badge>
              </div>
            </div>
          </div>

          {/* Fecha de creación */}
          <div>
            <Label className="text-sm text-muted-foreground">Fecha de Verificación</Label>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{formatDate(createdAt)}</span>
            </div>
          </div>

          {/* Comentario del vendedor */}
          <div>
            <Label className="text-sm text-muted-foreground">Comentario del Vendedor</Label>
            <div className="mt-1 p-3 bg-muted rounded-md">
              <p className="text-sm">{comment}</p>
            </div>
          </div>

          {/* Imagen del comprobante */}
          {photoUrl && (
            <div>
              <Label className="text-sm text-muted-foreground">Comprobante de Pago</Label>
              <div className="mt-2 border rounded-lg overflow-hidden">
                {!imageError ? (
                  <img
                    src={photoUrl}
                    alt="Comprobante de pago"
                    className="w-full max-h-96 object-contain"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 bg-muted">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Error al cargar la imagen</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => window.open(photoUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir en nueva pestaña
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Acciones de aprobación/rechazo */}
          {status.toUpperCase() === 'PENDING' && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  onClick={() => setAction('approve')}
                  variant={action === 'approve' ? 'default' : 'outline'}
                  className="flex-1"
                  disabled={loading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprobar Pago
                </Button>
                <Button
                  onClick={() => setAction('reject')}
                  variant={action === 'reject' ? 'destructive' : 'outline'}
                  className="flex-1"
                  disabled={loading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar Pago
                </Button>
              </div>

              {action === 'reject' && (
                <div>
                  <Label htmlFor="rejection-reason">Razón del Rechazo</Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Explique por qué rechaza este pago..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          {action && status.toUpperCase() === 'PENDING' && (
            <Button
              onClick={handleAction}
              variant={action === 'approve' ? 'default' : 'destructive'}
              disabled={loading || (action === 'reject' && !rejectionReason.trim())}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  {action === 'approve' ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmar Aprobación
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Confirmar Rechazo
                    </>
                  )}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}