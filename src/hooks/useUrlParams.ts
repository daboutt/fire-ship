import { useState, useEffect, useCallback } from 'react';

/**
 * Interface for the useUrlParams hook return value
 */
interface UrlParamsHook<T> {
  value: T | null;
  setParam: (value: T | null) => void;
  clearParam: () => void;
}

/**
 * Generic custom hook for managing URL parameters.
 * 
 * Provides methods to read, write, and clear URL parameters while maintaining
 * synchronization with the browser's URL state. Uses window.history.replaceState
 * to avoid polluting browser history.
 * 
 * @param key - The URL parameter key to manage
 * @param defaultValue - Optional default value when parameter is not present
 * @returns Object with current value and methods to update/clear the parameter
 * 
 * @example
 * ```typescript
 * const { value: roomCode, setParam: setRoomCode, clearParam: clearRoomCode } = useUrlParams('room');
 * 
 * // Set room code in URL
 * setRoomCode('ABC123');  // URL becomes ?room=ABC123
 * 
 * // Clear room code from URL
 * clearRoomCode();        // URL becomes current path without ?room parameter
 * ```
 */
export function useUrlParams<T extends string>(key: string, defaultValue?: T): UrlParamsHook<T> {
  const getParam = useCallback((): T | null => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(key);
    return value as T | null || defaultValue || null;
  }, [key, defaultValue]);

  const [value, setValue] = useState<T | null>(getParam);

  const setParam = useCallback((newValue: T | null) => {
    const params = new URLSearchParams(window.location.search);
    
    if (newValue !== null && newValue !== undefined) {
      params.set(key, newValue);
    } else {
      params.delete(key);
    }
    
    // Update URL without creating new history entry
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    
    window.history.replaceState({}, '', newUrl);
    setValue(newValue);
  }, [key]);

  const clearParam = useCallback(() => {
    setParam(null);
  }, [setParam]);

  // Synchronize with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setValue(getParam());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getParam]);

  return { value, setParam, clearParam };
}