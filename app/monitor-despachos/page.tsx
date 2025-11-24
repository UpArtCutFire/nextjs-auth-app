'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Truck, RefreshCw, ArrowLeft, ArrowRight, Phone, FileText, Package } from 'lucide-react';
import Link from 'next/link';

interface Dispatch {
  id: string;
  documentNumber: string;
  documentType: string;
  vendorCode: string;
  direccion: string;
  comuna: string;
  region: string;
  telefono?: string;
  correo?: string;
  tamanoDespacho: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  clienteNombre: string;
  status: 'PENDING' | 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  scheduledDate?: string;
  scheduledPeriod?: string;
  startedAt?: string;
  completedAt?: string;
  driverId?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    nombre: string;
    correo: string;
  };
  transport?: {
    id: string;
    patente: string;
    nombre: string;
    talla: string;
  };
}

interface DaySchedule {
  date: string;
  dayName: string;
  amDispatches: Dispatch[];
  pmDispatches: Dispatch[];
}

export default function MonitorDespachos() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Obtener el inicio de la semana actual
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Ajustar para que comience en domingo
    return new Date(d.setDate(diff));
  };

  // Generar los 7 días de la semana actual
  const generateWeekDays = (weekStart: Date): DaySchedule[] => {
    const days: DaySchedule[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      
      const dateString = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('es-CL', { weekday: 'long' });
      
      const dayDispatches = dispatches.filter(dispatch => {
        // Solo mostrar despachos con fecha programada (SCHEDULED, IN_TRANSIT, DELIVERED)
        if (!dispatch.scheduledDate || dispatch.status === 'PENDING') return false;
        // Extraer solo la parte de la fecha sin convertir a UTC
        const dispatchDateStr = dispatch.scheduledDate.split('T')[0] || dispatch.scheduledDate.split(' ')[0];
        return dispatchDateStr === dateString;
      });

      days.push({
        date: dateString,
        dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        amDispatches: dayDispatches.filter(d => d.scheduledPeriod === 'AM'),
        pmDispatches: dayDispatches.filter(d => d.scheduledPeriod === 'PM')
      });
    }
    return days;
  };

  const fetchDispatches = async () => {
    try {
      const response = await fetch('/api/dispatches/monitor');
      if (response.ok) {
        const data = await response.json();
        setDispatches(data);
        setLastUpdate(new Date());
      } else {
        console.error('Error al cargar despachos');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Primero cargar los despachos
    const loadInitialData = async () => {
      await fetchDispatches();
      
      // Mostrar la semana actual por defecto
      const currentWeek = getWeekStart(new Date());
      setCurrentWeekStart(currentWeek);
    };
    
    loadInitialData();
    
    // Actualizar cada 5 segundos para mayor tiempo real
    const interval = setInterval(fetchDispatches, 5000);
    return () => clearInterval(interval);
  }, []);

  const getSizeBadge = (size: string) => {
    const colors = {
      S: 'bg-blue-500',
      M: 'bg-green-500',
      L: 'bg-yellow-500',
      XL: 'bg-red-500',
      XXL: 'bg-purple-500'
    };
    return <Badge className={colors[size as keyof typeof colors] || 'bg-gray-500'}>{size}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: 'bg-gray-500', text: 'Pendiente' },
      SCHEDULED: { color: 'bg-blue-500', text: 'Programado' },
      IN_TRANSIT: { color: 'bg-orange-500', text: 'En Tránsito' },
      DELIVERED: { color: 'bg-green-500', text: 'Entregado' },
      CANCELLED: { color: 'bg-red-500', text: 'Cancelado' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-500', text: status };
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const goToPreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToCurrentWeek = () => {
    // Si hay despachos, ir a la semana del despacho más reciente programado
    if (dispatches.length > 0) {
      const dispatchWithDate = dispatches.find(d => d.scheduledDate);
      if (dispatchWithDate && dispatchWithDate.scheduledDate) {
        const dispatchDate = new Date(dispatchWithDate.scheduledDate);
        setCurrentWeekStart(getWeekStart(dispatchDate));
        return;
      }
    }
    // Si no hay despachos, ir a la semana actual
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  const weekDays = generateWeekDays(currentWeekStart);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando monitor de despachos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 rounded-lg p-3">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Monitor de Despachos</h1>
                <p className="text-gray-500">Vista de calendario en tiempo real - Actualización automática cada 5 segundos</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                <div>Última actualización:</div>
                <div>{lastUpdate.toLocaleTimeString('es-CL')}</div>
              </div>
              <Button
                onClick={fetchDispatches}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Actualizando...' : 'Actualizar'}
              </Button>
              <Link href="/dashboard">
                <Button variant="default" size="sm">
                  Volver al Sistema
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              onClick={goToPreviousWeek}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Semana Anterior
            </Button>
            <Button
              onClick={goToCurrentWeek}
              variant="default"
              size="sm"
            >
              {dispatches.length > 0 ? 'Ver Despachos' : 'Semana Actual'}
            </Button>
            <Button
              onClick={goToNextWeek}
              variant="outline"
              size="sm"
            >
              Semana Siguiente
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          
          <div className="text-lg font-semibold text-gray-700">
            {currentWeekStart.toLocaleDateString('es-CL', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </div>
        </div>

        {/* Calendar Grid */}
        {weekDays.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No hay despachos programados
              </h3>
              <p className="text-gray-500">
                Los despachos programados aparecerán aquí
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {weekDays.map((day) => {
              // Crear las fechas sin conversión de zona horaria
              const [year, month, dayNum] = day.date.split('-').map(Number);
              const dayDate = new Date(year, month - 1, dayNum);
              
              const today = new Date();
              const todayYear = today.getFullYear();
              const todayMonth = today.getMonth();
              const todayDay = today.getDate();
              const todayClean = new Date(todayYear, todayMonth, todayDay);
              
              const isPast = dayDate < todayClean;
              const isToday = dayDate.getTime() === todayClean.getTime();
              
              return (
              <Card key={day.date} className={`overflow-hidden ${
                isToday ? 'ring-2 ring-blue-500' : isPast ? 'opacity-75' : ''
              }`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg font-bold">
                      {day.dayName}
                      {isToday && (
                        <Badge className="ml-2 bg-blue-500">Hoy</Badge>
                      )}
                      {isPast && !isToday && (
                        <Badge className="ml-2 bg-gray-400">Pasado</Badge>
                      )}
                    </span>
                    <span className="text-sm text-gray-500">
                      {dayDate.toLocaleDateString('es-CL', {
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Turno Mañana */}
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-blue-800">Mañana</span>
                      <Badge variant="outline" className="text-xs">
                        {day.amDispatches.length}
                      </Badge>
                    </div>
                    {day.amDispatches.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Sin despachos</p>
                    ) : (
                      <div className="space-y-2">
                        {day.amDispatches.map((dispatch) => (
                          <div
                            key={dispatch.id}
                            className="bg-white rounded-lg p-3 border shadow-sm hover:shadow-md transition-shadow"
                          >
                            {/* Header con documento y talla */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 flex-1">
                                <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                <span className="font-bold text-sm text-blue-700">
                                  {dispatch.documentType} {dispatch.documentNumber}
                                </span>
                              </div>
                              <div className="flex-shrink-0">
                                {getSizeBadge(dispatch.tamanoDespacho)}
                              </div>
                            </div>

                            {/* Información principal */}
                            <div className="space-y-2 mb-3">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-3 w-3 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div className="text-xs">
                                  <div className="font-medium text-gray-800 leading-tight">
                                    {dispatch.direccion}
                                  </div>
                                  <div className="text-gray-500">
                                    {dispatch.comuna}, {dispatch.region}
                                  </div>
                                </div>
                              </div>
                              
                              {dispatch.telefono && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                  <span className="text-xs font-medium text-gray-800">
                                    {dispatch.telefono}
                                  </span>
                                </div>
                              )}
                              
                              {dispatch.transport && (
                                <div className="flex items-center gap-2">
                                  <Truck className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                  <div className="text-xs">
                                    <span className="font-medium text-gray-800">
                                      {dispatch.transport.patente}
                                    </span>
                                    <span className="text-gray-500 ml-1">
                                      - {dispatch.transport.nombre}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Estado en la parte inferior */}
                            <div className="flex justify-center pt-2 border-t border-gray-100">
                              {getStatusBadge(dispatch.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Turno Tarde */}
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span className="font-semibold text-orange-800">Tarde</span>
                      <Badge variant="outline" className="text-xs">
                        {day.pmDispatches.length}
                      </Badge>
                    </div>
                    {day.pmDispatches.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Sin despachos</p>
                    ) : (
                      <div className="space-y-2">
                        {day.pmDispatches.map((dispatch) => (
                          <div
                            key={dispatch.id}
                            className="bg-white rounded-lg p-3 border shadow-sm hover:shadow-md transition-shadow"
                          >
                            {/* Header con documento y talla */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 flex-1">
                                <FileText className="h-4 w-4 text-orange-600 flex-shrink-0" />
                                <span className="font-bold text-sm text-orange-700">
                                  {dispatch.documentType} {dispatch.documentNumber}
                                </span>
                              </div>
                              <div className="flex-shrink-0">
                                {getSizeBadge(dispatch.tamanoDespacho)}
                              </div>
                            </div>

                            {/* Información principal */}
                            <div className="space-y-2 mb-3">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-3 w-3 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div className="text-xs">
                                  <div className="font-medium text-gray-800 leading-tight">
                                    {dispatch.direccion}
                                  </div>
                                  <div className="text-gray-500">
                                    {dispatch.comuna}, {dispatch.region}
                                  </div>
                                </div>
                              </div>
                              
                              {dispatch.telefono && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                  <span className="text-xs font-medium text-gray-800">
                                    {dispatch.telefono}
                                  </span>
                                </div>
                              )}
                              
                              {dispatch.transport && (
                                <div className="flex items-center gap-2">
                                  <Truck className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                  <div className="text-xs">
                                    <span className="font-medium text-gray-800">
                                      {dispatch.transport.patente}
                                    </span>
                                    <span className="text-gray-500 ml-1">
                                      - {dispatch.transport.nombre}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Estado en la parte inferior */}
                            <div className="flex justify-center pt-2 border-t border-gray-100">
                              {getStatusBadge(dispatch.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}