
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bug, CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  data?: any;
  error?: string;
  timestamp?: string;
}

export default function ERPDebugPage() {
  const { data: session } = useSession();
  const [results, setResults] = useState<TestResult[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [globalData, setGlobalData] = useState<any>({});

  // Credenciales por defecto
  const [credentials, setCredentials] = useState({
    txtrutempresa: '77261114-5',
    txtusuario: '18221084-6',
    txtpwd: 'Rguz0608'
  });

  const updateResult = (step: string, status: TestResult['status'], data?: any, error?: string) => {
    setResults(prev => {
      const existing = prev.find(r => r.step === step);
      const newResult: TestResult = {
        step,
        status,
        data,
        error,
        timestamp: new Date().toLocaleTimeString()
      };
      
      if (existing) {
        return prev.map(r => r.step === step ? newResult : r);
      } else {
        return [...prev, newResult];
      }
    });
  };

  const testStep1Auth = async () => {
    setCurrentStep(1);
    updateResult('1. Autenticación ERP', 'running');
    
    try {
      const response = await fetch('/api/erp/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();
      
      if (data.success) {
        setGlobalData((prev: any) => ({ 
          ...prev, 
          redirectUrl: data.redirectUrl,
          authResponse: data.erp_response 
        }));
        
        // Crear información específica sobre la URL extraída
        const debugInfo = {
          ...data,
          extracted_url_info: {
            url_from_body: data.redirectUrl,
            url_source: 'campo "ur" del JSON de respuesta',
            next_step: 'GET a esta URL para obtener ci_session'
          }
        };
        
        updateResult('1. Autenticación ERP', 'success', debugInfo);
        toast.success(`Paso 1: URL extraída del body: ${data.redirectUrl?.substring(0, 50)}...`);
      } else {
        updateResult('1. Autenticación ERP', 'error', data, data.error);
        toast.error('Paso 1: Error en autenticación');
      }
    } catch (error) {
      updateResult('1. Autenticación ERP', 'error', null, error instanceof Error ? error.message : 'Error desconocido');
      toast.error('Paso 1: Error de red');
    }
  };

  const testStep2Session = async () => {
    if (!globalData.redirectUrl) {
      toast.error('Primero debe completar el Paso 1');
      return;
    }

    setCurrentStep(2);
    updateResult('2. Obtener Sesión', 'running');
    
    try {
      const response = await fetch('/api/erp/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ redirectUrl: globalData.redirectUrl })
      });

      const data = await response.json();
      
      if (data.success) {
        setGlobalData((prev: any) => ({ ...prev, ci_session: data.ci_session }));
        
        // Crear información específica sobre el GET y la sesión
        const debugInfo = {
          ...data,
          session_extraction_info: {
            target_url: globalData.redirectUrl,
            method: 'GET directo (sin seguir redirecciones)',
            ci_session_obtained: data.ci_session?.substring(0, 20) + '...',
            cookie_source: 'Header Set-Cookie de la respuesta GET',
            session_length: data.ci_session?.length || 0
          }
        };
        
        updateResult('2. Obtener Sesión', 'success', debugInfo);
        toast.success(`Paso 2: ci_session obtenida (${data.ci_session?.length} chars)`);
      } else {
        updateResult('2. Obtener Sesión', 'error', data, data.error);
        toast.error('Paso 2: Error obteniendo sesión');
      }
    } catch (error) {
      updateResult('2. Obtener Sesión', 'error', null, error instanceof Error ? error.message : 'Error desconocido');
      toast.error('Paso 2: Error de red');
    }
  };

  const testStep3Documents = async () => {
    if (!globalData.ci_session) {
      toast.error('Primero debe completar los Pasos 1 y 2');
      return;
    }

    setCurrentStep(3);
    updateResult('3. Consultar Documentos', 'running');
    
    try {
      const response = await fetch('/api/erp/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ci_session: globalData.ci_session,
          filters: {}
        })
      });

      const data = await response.json();
      
      if (data.success) {
        updateResult('3. Consultar Documentos', 'success', data);
        toast.success(`Paso 3: ${data.documents?.length || 0} documentos obtenidos`);
      } else {
        updateResult('3. Consultar Documentos', 'error', data, data.error);
        toast.error('Paso 3: Error consultando documentos');
      }
    } catch (error) {
      updateResult('3. Consultar Documentos', 'error', null, error instanceof Error ? error.message : 'Error desconocido');
      toast.error('Paso 3: Error de red');
    }
  };

  const runFullTest = async () => {
    setResults([]);
    setGlobalData({});
    setCurrentStep(0);
    
    // Ejecutar pasos secuencialmente
    await testStep1Auth();
    
    // Esperar un poco entre pasos
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (globalData.redirectUrl) {
      await testStep2Session();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (globalData.ci_session) {
        await testStep3Documents();
      }
    }
  };

  const clearResults = () => {
    setResults([]);
    setGlobalData({});
    setCurrentStep(0);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Badge variant="secondary">Ejecutando</Badge>;
      case 'success':
        return <Badge className="bg-green-500">Éxito</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Pendiente</Badge>;
    }
  };

  if (!session) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Debe iniciar sesión para acceder al debug del ERP.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Bug className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Debug ERP</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Panel de Control */}
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Test</CardTitle>
              <CardDescription>
                Configure las credenciales y ejecute las pruebas paso a paso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rut">RUT Empresa</Label>
                <Input
                  id="rut"
                  value={credentials.txtrutempresa}
                  onChange={(e) => setCredentials(prev => ({ ...prev, txtrutempresa: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usuario">Usuario</Label>
                <Input
                  id="usuario"
                  value={credentials.txtusuario}
                  onChange={(e) => setCredentials(prev => ({ ...prev, txtusuario: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.txtpwd}
                  onChange={(e) => setCredentials(prev => ({ ...prev, txtpwd: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={runFullTest} className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Ejecutar Test Completo
                </Button>
                
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={testStep1Auth}
                    disabled={currentStep === 1}
                  >
                    Paso 1
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={testStep2Session}
                    disabled={currentStep === 2 || !globalData.redirectUrl}
                  >
                    Paso 2
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={testStep3Documents}
                    disabled={currentStep === 3 || !globalData.ci_session}
                  >
                    Paso 3
                  </Button>
                </div>
                
                <Button variant="outline" onClick={clearResults}>
                  Limpiar Resultados
                </Button>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium mb-2">Flujo de Integración ERP:</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="font-medium text-blue-700 dark:text-blue-300">Paso 1: POST Login</div>
                    <div className="font-mono text-xs">POST https://clientes.erpyme.cl/login/login2post</div>
                    <div className="ml-2 mt-1 space-y-1 text-xs">
                      <div><strong>Parámetros:</strong></div>
                      <div className="font-mono ml-2">
                        data[txtrutempresa]: {credentials.txtrutempresa}<br/>
                        data[txtusuario]: {credentials.txtusuario}<br/>
                        data[txtpwd]: {credentials.txtpwd}
                      </div>
                      <div><strong>Respuesta esperada:</strong> JSON con campo "ur" (URL de redirección)</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-green-700 dark:text-green-300">Paso 2: GET a URL extraída</div>
                    <div className="font-mono text-xs">GET [URL del campo "ur"]</div>
                    <div className="ml-2 mt-1 text-xs">
                      <strong>Objetivo:</strong> Obtener cookie ci_session del header
                    </div>
                  </div>

                  <div>
                    <div className="font-medium text-purple-700 dark:text-purple-300">Paso 3: Consultar documentos</div>
                    <div className="ml-2 mt-1 text-xs">
                      <strong>Usar:</strong> ci_session obtenida para consultas
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-muted-foreground">
                    Content-Type: application/x-www-form-urlencoded
                  </div>
                </div>
              </div>

              {Object.keys(globalData).length > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Datos Globales:</h4>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(globalData, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resultados */}
          <Card>
            <CardHeader>
              <CardTitle>Resultados de Test</CardTitle>
              <CardDescription>
                Estado y detalles de cada paso de la integración
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No hay resultados aún. Ejecute un test para ver los resultados.
                  </p>
                ) : (
                  results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          <span className="font-medium">{result.step}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(result.status)}
                          {result.timestamp && (
                            <span className="text-xs text-muted-foreground">
                              {result.timestamp}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {result.error && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                          <strong>Error:</strong> {result.error}
                        </div>
                      )}
                      
                      {result.data && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                            Ver datos completos
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
