'use client';

import { Card, CardContent } from '@/components/ui/card';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface ProgressGaugeProps {
  percentage: number;
  title?: string;
  subtitle?: string;
  size?: number;
  className?: string;
  isLoading?: boolean;
}

export function ProgressGauge({
  percentage,
  title = 'Progreso',
  subtitle,
  size = 120,
  className,
  isLoading = false
}: ProgressGaugeProps) {
  const data = [
    {
      name: 'progress',
      value: percentage,
      fill: percentage >= 80 ? '#22c55e' : percentage >= 50 ? '#3b82f6' : '#f97316'
    }
  ];

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-gray-500 mb-2">{title}</p>
        <div className="flex items-center justify-between">
          <div className="relative" style={{ width: size, height: size }}>
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500" />
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="70%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                    data={data}
                  >
                    <RadialBar
                      background={{ fill: '#e5e7eb' }}
                      dataKey="value"
                      cornerRadius={10}
                      max={100}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="flex-1 ml-4">
            <p className="text-3xl font-bold text-gray-900">
              {isLoading ? '--' : `${percentage.toFixed(1)}%`}
            </p>
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProgressGauge;
