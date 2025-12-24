import { useState, useEffect, useCallback } from 'react';

const FAVORITES_KEY = 'vip7_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  }, [favorites]);

  const addFavorite = useCallback((codigo: number) => {
    setFavorites((prev) => {
      if (prev.includes(codigo)) return prev;
      return [...prev, codigo];
    });
  }, []);

  const removeFavorite = useCallback((codigo: number) => {
    setFavorites((prev) => prev.filter((id) => id !== codigo));
  }, []);

  const toggleFavorite = useCallback((codigo: number) => {
    setFavorites((prev) => {
      if (prev.includes(codigo)) {
        return prev.filter((id) => id !== codigo);
      }
      return [...prev, codigo];
    });
  }, []);

  const isFavorite = useCallback((codigo: number) => {
    return favorites.includes(codigo);
  }, [favorites]);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    count: favorites.length,
  };
}
