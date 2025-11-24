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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Eye,
  FileText,
  DollarSign,
  Calculator,
  TrendingUp,
  Info
} from 'lucide-react';

interface DocumentoDetalle {
  numDoc: string;
  tipoDoc: string;
  fecha: string;
  cliente: string;
  montoNeto: number;
  montoBruto: number; // Nuevo campo
  totalVerificado: number;
  montoFlete: number;
  baseComision: number; // totalVerificado - flete
  porcentajeAplicado: number;
  comisionCalculada: number;
}

interface CommissionDetailModalProps {
  vendorName: string;
  vendorCode: string;
  documentosDetalle: DocumentoDetalle[];
  porcentajeComision: number | null;
  comisionBase: number | null;
  children: React.ReactNode;
}

export function CommissionDetailModal({
  vendorName,
  vendorCode,
  documentosDetalle,
  porcentajeComision,
  comisionBase,
  children
}: CommissionDetailModalProps) {
  const [open, setOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totales = documentosDetalle.reduce(
    (acc, doc) => ({
      montoNetoTotal: acc.montoNetoTotal + doc.montoNeto,
      fleteTotal: acc.fleteTotal + doc.montoFlete,
      verificacionesTotal: acc.verificacionesTotal + doc.totalVerificado,
      comisionTotal: acc.comisionTotal + doc.comisionCalculada,
    }),
    { montoNetoTotal: 0, fleteTotal: 0, verificacionesTotal: 0, comisionTotal: 0 }
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Detalle de Comisiones - {vendorName}
          </DialogTitle>
          <DialogDescription>
            Desglose por documento de las comisiones calculadas para {vendorCode}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{documentosDetalle.length}</div>
                <p className="text-xs text-muted-foreground">Documentos procesados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Verificaciones</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totales.verificacionesTotal)}
                </div>
                <p className="text-xs text-muted-foreground">Monto total verificado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Flete</CardTitle>
                <span className="text-base">🚚</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(totales.fleteTotal)}
                </div>
                <p className="text-xs text-muted-foreground">Flete neto sin IVA (descontado)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comisión Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totales.comisionTotal)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {porcentajeComision ? `${porcentajeComision}%` : 'Sin porcentaje'} 
                  {comisionBase ? ` + base ${formatCurrency(comisionBase)}` : ''}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Información adicional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-4 w-4" />
                Fórmula de Cálculo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <p><strong>Paso 1:</strong> Validación: Total de verificaciones (incluido flete/transporte) debe ser IGUAL al monto bruto del documento</p>
                <p><strong>Paso 2:</strong> Si hay transporte/flete, se calcula el monto neto sin IVA (dividiendo por 1.19)</p>
                <p><strong>Paso 3:</strong> Base de comisión = Monto Neto - Flete Neto (sin IVA)</p>
                <p><strong>Paso 4:</strong> Aplicación del porcentaje de comisión sobre la base de comisión</p>
                <p><strong>Paso 5:</strong> Suma de comisión base (si aplica)</p>
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <code className="text-sm">
                    Base Comisión = Monto Neto - (Flete Bruto ÷ 1.19)<br/>
                    Comisión = (Base Comisión × {porcentajeComision || 0}%) + {comisionBase ? formatCurrency(comisionBase) : '$0'}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Solo se calculan comisiones cuando: Total Verificaciones = Monto Bruto
                </p>
                <p className="text-xs text-muted-foreground">
                  ⚠️ Los montos de transporte/flete se restan del monto neto (sin IVA) para calcular la comisión
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de detalles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Detalle por Documento
              </CardTitle>
              <CardDescription>
                Desglose de cada documento que contribuye a la comisión
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead className="text-right">Monto Bruto</TableHead>
                      <TableHead className="text-right">Monto Neto Ajustado</TableHead>
                      <TableHead className="text-right">Total Verificaciones</TableHead>
                      <TableHead className="text-right">Flete Neto (sin IVA)</TableHead>
                      <TableHead className="text-right">Base Comisión</TableHead>
                      <TableHead className="text-center">% Aplicado</TableHead>
                      <TableHead className="text-right">Comisión</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentosDetalle.map((doc, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {doc.tipoDoc} #{doc.numDoc}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-purple-600">
                          {formatCurrency(doc.montoBruto)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(doc.montoNeto)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-600">
                          {formatCurrency(doc.totalVerificado)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {doc.montoFlete > 0 ? formatCurrency(doc.montoFlete) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(doc.baseComision)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {doc.porcentajeAplicado}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(doc.comisionCalculada)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}