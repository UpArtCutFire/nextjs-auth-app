
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, Upload, Loader2, X, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { ERPDocument, PaymentMethod, PaymentVerification } from '@/lib/types';

interface PaymentVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ERPDocument | null;
  onSuccess?: () => void;
}

export function PaymentVerificationModal({ 
  open, 
  onOpenChange, 
  document,
  onSuccess 
}: PaymentVerificationModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [amount, setAmount] = useState<string>('');
  const [existingVerifications, setExistingVerifications] = useState<PaymentVerification[]>([]);
  const [loadingVerifications, setLoadingVerifications] = useState(false);

  // Cargar verificaciones existentes cuando se abre el modal
  useEffect(() => {
    if (document && open) {
      loadExistingVerifications();
    }
  }, [document, open]);

  // Calcular monto sugerido basado en verificaciones existentes
  useEffect(() => {
    if (document?.MntTotal && existingVerifications.length >= 0) {
      const totalAmount = typeof document.MntTotal === 'string' ? 
        parseFloat(document.MntTotal) : document.MntTotal;
      
      // Calcular total ya verificado EXCLUYENDO flete (flete no reduce monto disponible)
      const totalVerificadoPagos = existingVerifications
        .filter(verification => verification.paymentMethod !== 'flete')
        .reduce((sum, verification) => sum + (verification.amount || 0), 0);
      
      // Monto restante disponible (sin considerar flete)
      const montoRestante = totalAmount - totalVerificadoPagos;
      
      // Establecer monto sugerido
      if (montoRestante > 0) {
        setAmount(montoRestante.toString());
      } else {
        setAmount('0');
      }
    }
  }, [document, existingVerifications]);

  const loadExistingVerifications = async () => {
    if (!document) return;
    
    setLoadingVerifications(true);
    try {
      const response = await fetch(`/api/payment-verifications?documentNumber=${document.NumDoc}&documentType=${document.TipoDoc}`);
      const data = await response.json();
      
      if (data.success) {
        // Filtrar solo verificaciones aprobadas
        const approvedVerifications = data.verifications.filter((v: PaymentVerification) => v.status === 'APPROVED');
        setExistingVerifications(approvedVerifications);
      }
    } catch (error) {
      console.error('Error loading existing verifications:', error);
    } finally {
      setLoadingVerifications(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona un archivo de imagen');
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen no puede superar los 5MB');
        return;
      }

      setSelectedFile(file);

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Para transferencia y webpay, la foto es obligatoria
    // Para efectivo y flete, la foto es opcional
    const isPhotoRequired = paymentMethod === 'transferencia' || paymentMethod === 'webpay';
    
    if (!document || !comment.trim() || !paymentMethod || !amount) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    // Validar que el monto sea un número válido y mayor a 0
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Por favor ingresa un monto válido');
      return;
    }

    if (isPhotoRequired && !selectedFile) {
      toast.error('Para transferencias y pagos con tarjeta, la foto del comprobante es obligatoria');
      return;
    }

    const user = session?.user as any;
    if (!user?.codigo_vendedor) {
      toast.error('Usuario sin código de vendedor asignado');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('documentNumber', document.NumDoc || '');
      formData.append('documentType', document.TipoDoc || '');
      formData.append('comment', comment.trim());
      formData.append('paymentMethod', paymentMethod);
      formData.append('amount', numericAmount.toString());
      
      // Solo agregar foto si está seleccionada
      if (selectedFile) {
        formData.append('photo', selectedFile);
      }
      
      // Crear información del documento como JSON
      const documentInfo = {
        NumDoc: document.NumDoc,
        TipoDoc: document.TipoDoc,
        FchDoc: document.FchDoc,
        NomCliente: document.NomCliente,
        CodCli: document.CodCli,
        MntNeto: document.MntNeto,
        MntTotal: document.MntTotal,
        EstadoDoc: document.EstadoDoc,
        Vendedor: document.Vendedor,
      };
      formData.append('documentInfo', JSON.stringify(documentInfo));

      const response = await fetch('/api/payment-verifications', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Verificación de pago creada exitosamente');
        onOpenChange(false);
        resetForm();
        onSuccess?.();
      } else {
        toast.error(data.error || 'Error al crear la verificación');
      }
    } catch (error) {
      console.error('Error creating verification:', error);
      toast.error('Error al crear la verificación');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreview(null);
    setComment('');
    setPaymentMethod('');
    setAmount('');
    setExistingVerifications([]);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Verificar Pago
          </DialogTitle>
          <DialogDescription>
            Documenta la verificación de pago para el documento {document?.TipoDoc} #{document?.NumDoc}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información del documento */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm space-y-1">
              <div><strong>Cliente:</strong> {document?.NomCliente}</div>
              <div><strong>Monto Total:</strong> {document?.MntTotal ? 
                new Intl.NumberFormat('es-CL', {
                  style: 'currency',
                  currency: 'CLP'
                }).format(typeof document.MntTotal === 'string' ? parseFloat(document.MntTotal) : document.MntTotal)
                : '-'
              }</div>
              <div><strong>Fecha:</strong> {document?.FchDoc ? 
                new Date(document.FchDoc).toLocaleDateString('es-CL') : '-'
              }</div>
              
              {/* Información de verificaciones existentes */}
              {loadingVerifications ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando verificaciones...
                </div>
              ) : existingVerifications.length > 0 && (
                <div className="pt-2 border-t border-border/50">
                  <div><strong>Verificaciones existentes:</strong> {existingVerifications.length}</div>
                  <div><strong>Pagos verificados:</strong> {
                    new Intl.NumberFormat('es-CL', {
                      style: 'currency',
                      currency: 'CLP'
                    }).format(
                      existingVerifications
                        .filter(v => v.paymentMethod !== 'flete')
                        .reduce((sum, v) => sum + (v.amount || 0), 0)
                    )
                  }</div>
                  {existingVerifications.some(v => v.paymentMethod === 'flete') && (
                    <div><strong>Flete registrado:</strong> {
                      new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP'
                      }).format(
                        existingVerifications
                          .filter(v => v.paymentMethod === 'flete')
                          .reduce((sum, v) => sum + (v.amount || 0), 0)
                      )
                    } <span className="text-muted-foreground">(no afecta monto disponible)</span></div>
                  )}
                  <div><strong>Monto disponible:</strong> {
                    document?.MntTotal ? 
                    new Intl.NumberFormat('es-CL', {
                      style: 'currency',
                      currency: 'CLP'
                    }).format(
                      (typeof document.MntTotal === 'string' ? parseFloat(document.MntTotal) : document.MntTotal) - 
                      existingVerifications
                        .filter(v => v.paymentMethod !== 'flete')
                        .reduce((sum, v) => sum + (v.amount || 0), 0)
                    ) : '-'
                  }</div>
                </div>
              )}
            </div>
          </div>

          {/* Método de pago */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de Pago *</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              disabled={loading}
            >
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Selecciona el método de pago" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                <SelectItem value="transferencia">🏦 Transferencia Bancaria</SelectItem>
                <SelectItem value="webpay">💳 Webpay / Tarjeta</SelectItem>
                <SelectItem value="flete">🚚 Monto Flete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Monto del pago */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              {paymentMethod === 'flete' ? 'Monto del Flete *' : 'Monto del Pago *'}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="pl-8"
                step="1"
                min="1"
                disabled={loading}
              />
            </div>
            {paymentMethod === 'flete' ? (
              <p className="text-sm text-muted-foreground">
                ⚠️ Este monto será restado del total neto al calcular comisiones
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {existingVerifications.length > 0 ? (
                  <>Monto disponible: {document?.MntTotal ? 
                    new Intl.NumberFormat('es-CL', {
                      style: 'currency',
                      currency: 'CLP'
                    }).format(
                      (typeof document.MntTotal === 'string' ? parseFloat(document.MntTotal) : document.MntTotal) - 
                      existingVerifications
                        .filter(v => v.paymentMethod !== 'flete')
                        .reduce((sum, v) => sum + (v.amount || 0), 0)
                    ) : '-'
                  }</>
                ) : (
                  <>Monto sugerido: {document?.MntTotal ? 
                    new Intl.NumberFormat('es-CL', {
                      style: 'currency',
                      currency: 'CLP'
                    }).format(typeof document.MntTotal === 'string' ? parseFloat(document.MntTotal) : document.MntTotal)
                    : '-'
                  }</>
                )}
              </p>
            )}
          </div>

          {/* Subir foto */}
          <div className="space-y-2">
            <Label htmlFor="photo">
              Foto del Comprobante de Pago 
              {(paymentMethod === 'efectivo' || paymentMethod === 'flete') ? ' (Opcional)' : ' *'}
            </Label>
            {(paymentMethod === 'efectivo' || paymentMethod === 'flete') && (
              <p className="text-sm text-muted-foreground">
                💡 Para pagos en efectivo y registro de flete, la foto es opcional
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={loading}
                className="cursor-pointer"
              />
              {preview && (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full max-h-48 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreview(null);
                    }}
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Comentario */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comentario sobre la Verificación *</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe el estado del pago, método utilizado, observaciones, etc."
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                loading || 
                !comment.trim() || 
                !paymentMethod || 
                !amount ||
                ((paymentMethod !== 'efectivo' && paymentMethod !== 'flete') && !selectedFile) // Solo requerir foto si no es efectivo ni flete
              }
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Guardar Verificación
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
