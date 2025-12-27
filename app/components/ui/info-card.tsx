'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoCardItem {
  label: string;
  value: string | number;
  highlight?: boolean;
}

interface InfoCardProps {
  title: string;
  items: InfoCardItem[];
  icon?: React.ReactNode;
  isLoading?: boolean;
  variant?: 'blue' | 'green' | 'default';
  className?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export function InfoCard({
  title,
  items,
  icon,
  isLoading = false,
  variant = 'blue',
  className
}: InfoCardProps) {
  const variantStyles = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    default: 'bg-gray-50 border-gray-200'
  };

  const variantTextStyles = {
    blue: 'text-blue-800',
    green: 'text-green-800',
    default: 'text-gray-800'
  };

  const variantSubtextStyles = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    default: 'text-gray-600'
  };

  return (
    <Card
      className={cn(
        'hover:shadow-md transition-shadow',
        variantStyles[variant],
        className
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className={cn(
          'text-sm font-medium flex items-center gap-2',
          variantTextStyles[variant]
        )}>
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className={cn(
                  'text-xs',
                  variantSubtextStyles[variant]
                )}>
                  {item.label}
                </span>
                <span className={cn(
                  'font-semibold',
                  item.highlight ? 'text-lg' : 'text-sm',
                  variantTextStyles[variant]
                )}>
                  {typeof item.value === 'number' && item.value > 1000
                    ? formatCurrency(item.value)
                    : item.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Card especial para "Mejor Mes"
interface BestMonthCardProps {
  bestMonthLabel: string;
  bestMonthAmount: number;
  currentMonthLabel: string;
  currentMonthAmount: number;
  isLoading?: boolean;
  className?: string;
}

export function BestMonthCard({
  bestMonthLabel,
  bestMonthAmount,
  currentMonthLabel,
  currentMonthAmount,
  isLoading = false,
  className
}: BestMonthCardProps) {
  return (
    <Card
      className={cn(
        'bg-green-50 border-green-200 hover:shadow-md transition-shadow',
        className
      )}
    >
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-green-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-green-600 uppercase">
                Tu Mejor Mes
              </p>
              <p className="text-lg font-bold text-green-800">
                {bestMonthLabel}
              </p>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(bestMonthAmount)}
              </p>
            </div>
            <div className="pt-3 border-t border-green-200">
              <p className="text-xs font-medium text-green-600 uppercase">
                Mes en Curso
              </p>
              <p className="text-sm font-medium text-green-700">
                {currentMonthLabel}
              </p>
              <p className="text-xl font-bold text-green-800">
                {formatCurrency(currentMonthAmount)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default InfoCard;
