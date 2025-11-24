// Utilidades para manejo de equivalencias de tallas

export interface SizeEquivalence {
  id: string;
  size: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  value: number;
  description?: string;
}

// Función para obtener equivalencias desde la API
export async function fetchSizeEquivalences(): Promise<SizeEquivalence[]> {
  try {
    const response = await fetch('/api/size-equivalences');
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch size equivalences');
  } catch (error) {
    console.error('Error fetching size equivalences:', error);
    return getDefaultEquivalences();
  }
}

// Equivalencias por defecto como fallback
export function getDefaultEquivalences(): SizeEquivalence[] {
  return [
    { id: 'default-s', size: 'S', value: 1, description: 'Pequeño' },
    { id: 'default-m', size: 'M', value: 2, description: 'Mediano' },
    { id: 'default-l', size: 'L', value: 3, description: 'Grande' },
    { id: 'default-xl', size: 'XL', value: 4, description: 'Extra Grande' },
    { id: 'default-xxl', size: 'XXL', value: 10, description: 'Extra Extra Grande' }
  ];
}

// Función para obtener el valor de puntos de una talla específica
export function getSizePoints(size: string, equivalences: SizeEquivalence[]): number {
  const equivalence = equivalences.find(eq => eq.size === size);
  return equivalence?.value || 0;
}

// Función para crear un mapa de equivalencias para acceso rápido
export function createEquivalenceMap(equivalences: SizeEquivalence[]): Record<string, number> {
  return equivalences.reduce((acc, eq) => {
    acc[eq.size] = eq.value;
    return acc;
  }, {} as Record<string, number>);
}

// Función para validar si las equivalencias son válidas
export function validateEquivalences(equivalences: SizeEquivalence[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validSizes: ('S' | 'M' | 'L' | 'XL' | 'XXL')[] = ['S', 'M', 'L', 'XL', 'XXL'];
  
  // Verificar que todas las tallas estén presentes
  const presentSizes = equivalences.map(eq => eq.size);
  const missingSizes = validSizes.filter(size => !presentSizes.includes(size));
  
  if (missingSizes.length > 0) {
    errors.push(`Faltan las tallas: ${missingSizes.join(', ')}`);
  }

  // Verificar que no haya tallas duplicadas
  const uniqueSizes = [...new Set(presentSizes)];
  if (presentSizes.length !== uniqueSizes.length) {
    errors.push('No se permiten tallas duplicadas');
  }

  // Verificar que los valores estén en rango válido
  for (const eq of equivalences) {
    if (eq.value < 1 || eq.value > 50) {
      errors.push(`Valor inválido para talla ${eq.size}: ${eq.value}. Debe estar entre 1 y 50`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}