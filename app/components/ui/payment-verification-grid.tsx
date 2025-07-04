
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Eye, 
  Trash2, 
  Edit, 
  FileCheck, 
  Calendar,
  User,
  MessageSquare,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  CreditCard,
  Banknote,
  Building2
} from 'lucide-react';
import { PaymentVerification } from '@/lib/types';
import { toast } from 'sonner';

interface PaymentVerificationGridProps {
  documentNumber?: string;
  documentType?: string;
  refreshTrigger?: number;
}

export function PaymentVerificationGrid({ 
  documentNumber, 
  documentType,
  refreshTrigger = 0
}: PaymentVerificationGridProps) {
  const { data: session } = useSession();
  const [verifications, setVerifications] = useState<PaymentVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<PaymentVerification | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Cargar verificaciones
  const loadVerifications = async () => {
    const user = session?.user as any;
    if (!user || user.perfil !== 'vendedor') return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (documentNumber) params.append('documentNumber', documentNumber);
      if (documentType) params.append('documentType', documentType);

      const response = await fetch(`/api/payment-verifications?${params}`);
      const data = await response.json();

      if (data.success) {
        setVerifications(data.verifications || []);
      } else {
        toast.error(data.error || 'Error al cargar verificaciones');
      }
    } catch (error) {
      console.error('Error loading verifications:', error);
      toast.error('Error al cargar verificaciones');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar verificación
  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/payment-verifications/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Verificación eliminada exitosamente');
        setVerifications(prev => prev.filter(v => v.id !== id));
      } else {
        toast.error(data.error || 'Error al eliminar verificación');
      }
    } catch (error) {
      console.error('Error deleting verification:', error);
      toast.error('Error al eliminar verificación');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  // Ver detalles de verificación
  const handleView = (verification: PaymentVerification) => {
    setSelectedVerification(verification);
    setViewModalOpen(true);
  };

  // Formatear fecha
  const formatDate = (dateStr: string | Date) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  // Parsear información del documento
  const parseDocumentInfo = (documentInfoStr: string) => {
    try {
      return JSON.parse(documentInfoStr);
    } catch {
      return {};
    }
  };

  // Función para obtener el ícono del método de pago
  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'efectivo':
        return <Banknote className="h-4 w-4" />;
      case 'transferencia':
        return <Building2 className="h-4 w-4" />;
      case 'webpay':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  // Función para obtener la etiqueta del método de pago
  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'efectivo':
        return 'Efectivo';
      case 'transferencia':
        return 'Transferencia';
      case 'webpay':
        return 'Webpay';
      default:
        return method;
    }
  };

  // Función para obtener el color del badge del método de pago
  const getPaymentMethodVariant = (method: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (method) {
      case 'efectivo':
        return 'default';
      case 'transferencia':
        return 'secondary';
      case 'webpay':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Efectos
  useEffect(() => {
    loadVerifications();
  }, [session, documentNumber, documentType, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Cargando verificaciones...</span>
      </div>
    );
  }

  if (verifications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No se encontraron verificaciones de pago</p>
        {documentNumber && (
          <p className="text-sm mt-2">Para el documento {documentType} #{documentNumber}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Fecha Verificación</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Método de Pago</TableHead>
              <TableHead>Comentario</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {verifications.map((verification) => {
              const docInfo = parseDocumentInfo(verification.documentInfo);
              return (
                <TableRow key={verification.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {verification.documentType} #{verification.documentNumber}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {docInfo.FchDoc ? new Date(docInfo.FchDoc).toLocaleDateString('es-CL') : '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formatDate(verification.createdAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{docInfo.NomCliente || '-'}</span>
                      <span className="text-sm text-muted-foreground">{docInfo.CodCli || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {docInfo.MntTotal ? 
                      new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP'
                      }).format(typeof docInfo.MntTotal === 'string' ? parseFloat(docInfo.MntTotal) : docInfo.MntTotal)
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPaymentMethodVariant(verification.paymentMethod)} className="flex items-center gap-1 w-fit">
                      {getPaymentMethodIcon(verification.paymentMethod)}
                      {getPaymentMethodLabel(verification.paymentMethod)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={verification.comment}>
                      {verification.comment}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(verification)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteId(verification.id)}
                        disabled={deleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Modal de vista de detalles */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Detalles de Verificación
            </DialogTitle>
            <DialogDescription>
              Información completa de la verificación de pago
            </DialogDescription>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-6">
              {/* Información del documento */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Información del Documento
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {(() => {
                    const docInfo = parseDocumentInfo(selectedVerification.documentInfo);
                    return (
                      <>
                        <div><strong>Número:</strong> {docInfo.NumDoc || '-'}</div>
                        <div><strong>Tipo:</strong> {docInfo.TipoDoc || '-'}</div>
                        <div><strong>Cliente:</strong> {docInfo.NomCliente || '-'}</div>
                        <div><strong>Código Cliente:</strong> {docInfo.CodCli || '-'}</div>
                        <div><strong>Monto Total:</strong> {docInfo.MntTotal ? 
                          new Intl.NumberFormat('es-CL', {
                            style: 'currency',
                            currency: 'CLP'
                          }).format(typeof docInfo.MntTotal === 'string' ? parseFloat(docInfo.MntTotal) : docInfo.MntTotal)
                          : '-'
                        }</div>
                        <div><strong>Estado:</strong> {docInfo.EstadoDoc || '-'}</div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Método de pago */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Método de Pago
                </h4>
                <div className="flex items-center gap-2">
                  <Badge variant={getPaymentMethodVariant(selectedVerification.paymentMethod)} className="flex items-center gap-1">
                    {getPaymentMethodIcon(selectedVerification.paymentMethod)}
                    {getPaymentMethodLabel(selectedVerification.paymentMethod)}
                  </Badge>
                </div>
              </div>

              {/* Foto */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Comprobante de Pago
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={selectedVerification.photoUrl}
                    alt="Comprobante de pago"
                    className="w-full max-h-96 object-contain"
                  />
                </div>
              </div>

              {/* Comentario */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comentario
                </h4>
                <p className="text-sm bg-muted p-3 rounded-lg">
                  {selectedVerification.comment}
                </p>
              </div>

              {/* Información de la verificación */}
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Verificado por: {selectedVerification.user?.nombre || 'Usuario'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Fecha: {formatDate(selectedVerification.createdAt)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              ¿Eliminar verificación?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la verificación 
              y su foto asociada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
