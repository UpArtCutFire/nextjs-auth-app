'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface MonthSelectorProps {
  selectedMonth: string; // "2025-12"
  onChange: (month: string) => void;
  className?: string;
}

export function MonthSelector({
  selectedMonth,
  onChange,
  className
}: MonthSelectorProps) {
  const [open, setOpen] = useState(false);

  const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  const handleSelect = (year: number, month: number) => {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    onChange(monthStr);
    setOpen(false);
  };

  const getMonthLabel = () => {
    return `${MONTH_NAMES[selectedMonthNum - 1]} ${selectedYear}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className={cn(
            'bg-yellow-400 hover:bg-yellow-500 text-black font-semibold',
            className
          )}
        >
          <Calendar className="h-4 w-4 mr-2" />
          FILTRO MES: {getMonthLabel()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seleccionar Mes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {years.map(year => (
            <div key={year}>
              <p className="text-sm font-semibold text-gray-700 mb-2">{year}</p>
              <div className="grid grid-cols-4 gap-2">
                {MONTH_NAMES.map((monthName, index) => {
                  const isSelected = year === selectedYear && index === selectedMonthNum - 1;
                  const isFuture = year === currentYear && index > new Date().getMonth();

                  return (
                    <Button
                      key={`${year}-${index}`}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      disabled={isFuture}
                      onClick={() => handleSelect(year, index)}
                      className={cn(
                        'text-xs',
                        isSelected && 'bg-blue-600 text-white',
                        isFuture && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {monthName.substring(0, 3)}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MonthSelector;
