// Tipos de Usuario
export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rut: string;
  activo: boolean;
  perfil: 'administrador' | 'vendedor';
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
export type PaymentMethod = 'efectivo' | 'transferencia' | 'webpay';

export interface PaymentVerification {
  id: string;
  documentNumber: string;
  documentType: string;
  vendorCode: string;
  photoUrl: string;
  comment: string;
  documentInfo: string; // JSON string con info del documento
  paymentMethod: PaymentMethod; // Método de pago utilizado
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    nombre: string;
    codigo_vendedor?: string;
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