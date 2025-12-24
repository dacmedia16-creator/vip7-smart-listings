import { useState, useCallback } from 'react';
import { ImoviewProperty } from '@/services/imoviewApi';

const MAX_COMPARE = 3;

export function useCompare() {
  const [compareList, setCompareList] = useState<ImoviewProperty[]>([]);

  const addToCompare = useCallback((property: ImoviewProperty) => {
    setCompareList((prev) => {
      if (prev.length >= MAX_COMPARE) return prev;
      if (prev.some((p) => p.codigo === property.codigo)) return prev;
      return [...prev, property];
    });
  }, []);

  const removeFromCompare = useCallback((codigo: number) => {
    setCompareList((prev) => prev.filter((p) => p.codigo !== codigo));
  }, []);

  const toggleCompare = useCallback((property: ImoviewProperty) => {
    setCompareList((prev) => {
      const exists = prev.some((p) => p.codigo === property.codigo);
      if (exists) {
        return prev.filter((p) => p.codigo !== property.codigo);
      }
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, property];
    });
  }, []);

  const isInCompare = useCallback((codigo: number) => {
    return compareList.some((p) => p.codigo === codigo);
  }, [compareList]);

  const clearCompare = useCallback(() => {
    setCompareList([]);
  }, []);

  const canAddMore = compareList.length < MAX_COMPARE;

  return {
    compareList,
    addToCompare,
    removeFromCompare,
    toggleCompare,
    isInCompare,
    clearCompare,
    canAddMore,
    count: compareList.length,
    maxCompare: MAX_COMPARE,
  };
}
