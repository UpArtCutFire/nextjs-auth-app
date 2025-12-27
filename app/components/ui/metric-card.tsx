'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  alertBg?: boolean; // Para el card de "Sin Verificar" con fondo naranja
  isLoading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'bg-gray-100',
  alertBg = false,
  isLoading = false,
  trend,
  className
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        'hover:shadow-md transition-shadow',
        alertBg && 'bg-orange-50 border-orange-200',
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={cn(
              'text-sm font-medium',
              alertBg ? 'text-orange-800' : 'text-gray-500'
            )}>
              {title}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : (
                <p className={cn(
                  'text-3xl font-bold',
                  alertBg ? 'text-orange-700' : 'text-gray-900'
                )}>
                  {value}
                </p>
              )}
              {trend && !isLoading && (
                <span
                  className={cn(
                    'text-sm font-medium',
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className={cn(
                'mt-1 text-sm',
                alertBg ? 'text-orange-600' : 'text-gray-500'
              )}>
                {subtitle}
              </p>
            )}
          </div>
          {icon && (
            <div
              className={cn(
                'p-3 rounded-lg',
                alertBg ? 'bg-orange-100' : iconBgColor
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default MetricCard;
