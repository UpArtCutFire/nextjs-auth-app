// Tipos de Usuario
export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rut: string;
  activo: boolean;
  perfil: 'administrador' | 'vendedor' | 'planificador';
  codigo_vendedor?: string;
  porcentaje_comision?: number;
  comision_base?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para integración ERP
export interface ERPAuthRequest {
  data: {
    txtrutempresa: string;
    txtusuario: string;
    txtpwd: string;
  };
}

export interface ERPAuthResponse {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

export interface ERPSessionResponse {
  success: boolean;
  ci_session?: string;
  error?: string;
}

export interface ERPDocumentFilter {
  query?: string;
  limit?: number;
  ascending?: number;
  page?: string;
  byColumn?: number;
  orderBy?: string;
  NumDoc?: string;
  NomCliente?: string;
  CodCli?: string;
  NomContacto?: string;
  GlosaDoc?: string;
  notificada?: string;
  rutCli?: string;
  cc?: string;
  MntNeto?: string;
  MntTotal?: string;
  MntTotalMin?: string;
  MntTotalMax?: string;
  TipoMoneda?: string;
  Vendedor?: string; // Campo correcto del ERP
  CodVend?: string; // Mantener por compatibilidad
  AfectaCT?: string;
  EstadoProcesoDoc?: string; // Campo legacy
  EstadoDoc?: string; // Campo correcto del ERP
  FchDoc?: string;
  TipoDoc?: string;
  acno?: string;
  losprimeros?: string;
}

export interface ERPDocument {
  NumDoc?: string;
  TipoDoc?: string;
  FchDoc?: string;
  NomCliente?: string;
  CodCli?: string;
  RutCli?: string;
  MntNeto?: number | string;
  MntTotal?: number | string;
  Vendedor?: string; // Código del vendedor del JSON ERP
  CodVend?: string; // Mantener por compatibilidad
  EstadoProcesoDoc?: string; // Campo legacy
  EstadoDoc?: string; // Campo correcto del ERP
  GlosaDoc?: string;
  TipoMoneda?: string;
  Desglose?: string; // Campo JSON con referencias de documentos
  // Agregar más campos según la respuesta real del ERP
  [key: string]: any;
}

// Interface para referencias de documentos parseadas del Desglose
export interface DocumentReference {
  tipo?: string;
  numero?: string;
  fecha?: string;
  monto?: number | string;
  estado?: string;
  [key: string]: any;
}

export interface ERPDocumentsResponse {
  success: boolean;
  documents?: ERPDocument[];
  error?: string;
  totalCount?: number;
}

export type DateRange = {
  from: Date | undefined
  to: Date | undefined
}

// Tipos para verificación de pagos
export type PaymentMethod = 'efectivo' | 'transferencia' | 'webpay' | 'flete';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PaymentVerification {
  id: string;
  documentNumber: string;
  documentType: string;
  vendorCode: string;
  photoUrl: string;
  comment: string;
  documentInfo: string; // JSON string con info del documento
  paymentMethod: PaymentMethod; // Método de pago utilizado
  amount?: number; // Monto verificado
  userId: string;
  status: PaymentStatus;
  approvedAt?: Date;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    nombre: string;
    codigo_vendedor?: string;
  };
  approver?: {
    id: string;
    nombre: string;
  };
}

export interface PaymentVerificationCreate {
  documentNumber: string;
  documentType: string;
  vendorCode: string;
  photoUrl: string;
  comment: string;
  documentInfo: string;
  paymentMethod: PaymentMethod;
}

export interface PaymentVerificationUpdate {
  photoUrl?: string;
  comment?: string;
  documentInfo?: string;
  paymentMethod?: PaymentMethod;
}

export interface PaymentVerificationResponse {
  success: boolean;
  verification?: PaymentVerification;
  verifications?: PaymentVerification[];
  error?: string;
  message?: string;
}

// =====================================================
// Tipos para Dashboard de Métricas del Vendedor
// =====================================================

export interface VendorMetricsCurrentMonth {
  totalDocuments: number;      // Total CT/NV del mes
  verifiedDocuments: number;   // CT/NV con verificación APPROVED
  pendingDocuments: number;    // CT/NV sin verificación
  progressPercentage: number;  // (verified / total) * 100
  grossSales: number;          // Suma de MntTotal
}

export interface MonthlyComparisonData {
  month: string;               // "2025-12"
  monthLabel: string;          // "Diciembre"
  grossSales: number;          // Ventas brutas del mes
  documentsCount: number;      // Cantidad de documentos
}

export interface CommissionHistoryData {
  month: string;               // "2025-12"
  monthLabel: string;          // "Diciembre"
  commission: number;          // Comisión calculada
}

export interface BestMonthData {
  month: string;               // "2025-12"
  monthLabel: string;          // "Diciembre"
  year: number;                // 2025
  grossSales: number;          // Ventas brutas
  commission: number;          // Comisión del mes
}

export interface MonthComparisonData {
  previousMonth: {
    label: string;
    commission: number;
    documentsTotal: number;
    documentsVerified: number;
  };
  currentMonth: {
    label: string;
    commission: number;
    documentsTotal: number;
    documentsVerified: number;
  };
}

export interface DistributionData {
  name: string;                // "Verificados", "Pendientes"
  value: number;
  color: string;               // Color hex
}

export interface VendorMetrics {
  currentMonth: VendorMetricsCurrentMonth;
  monthlyComparison: MonthlyComparisonData[];
  commissionsHistory: CommissionHistoryData[];
  bestMonth: BestMonthData;
  monthComparison: MonthComparisonData;
  documentDistribution: DistributionData[];
}

export interface VendorInfo {
  codigoVendedor: string;
  porcentajeComision: number | null;
  comisionBase: number | null;
}

export interface VendorMetricsResponse {
  success: boolean;
  metrics?: VendorMetrics;
  vendorInfo?: VendorInfo;
  selectedMonth?: string;
  error?: string;
}