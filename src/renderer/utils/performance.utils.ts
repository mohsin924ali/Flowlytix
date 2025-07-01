/**
 * Performance Utilities
 * Collection of utilities for performance optimization and memory leak prevention
 */

import { useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for managing timeouts with automatic cleanup
 * Prevents memory leaks from uncleaned timeouts
 */
export const useTimeout = () => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExistingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const setManagedTimeout = useCallback(
    (callback: () => void, delay: number) => {
      clearExistingTimeout();
      timeoutRef.current = setTimeout(callback, delay);
      return timeoutRef.current;
    },
    [clearExistingTimeout]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearExistingTimeout();
    };
  }, [clearExistingTimeout]);

  return { setManagedTimeout, clearExistingTimeout };
};

/**
 * Custom hook for managing intervals with automatic cleanup
 */
export const useInterval = () => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearExistingInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const setManagedInterval = useCallback(
    (callback: () => void, delay: number) => {
      clearExistingInterval();
      intervalRef.current = setInterval(callback, delay);
      return intervalRef.current;
    },
    [clearExistingInterval]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearExistingInterval();
    };
  }, [clearExistingInterval]);

  return { setManagedInterval, clearExistingInterval };
};

/**
 * Debounce function for performance optimization
 * Prevents excessive function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function for performance optimization
 * Limits function execution frequency
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Memory-safe event listener hook
 * Automatically cleans up event listeners
 */
export const useEventListener = <T extends keyof WindowEventMap>(
  eventName: T,
  handler: (event: WindowEventMap[T]) => void,
  element: EventTarget = window
) => {
  const savedHandler = useRef<(event: WindowEventMap[T]) => void>();

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const isSupported = element && element.addEventListener;
    if (!isSupported) return;

    const eventListener = (event: WindowEventMap[T]) => {
      if (savedHandler.current) {
        savedHandler.current(event);
      }
    };

    element.addEventListener(eventName, eventListener as EventListener);

    return () => {
      element.removeEventListener(eventName, eventListener as EventListener);
    };
  }, [eventName, element]);
};

/**
 * Development-only logger that's removed in production
 */
export const devLog = (message: string, ...args: any[]): void => {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log(message, ...args);
  }
};

/**
 * Performance monitoring utilities
 */
export const performanceUtils = {
  /**
   * Mark a performance point
   */
  mark: (name: string): void => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  },

  /**
   * Measure performance between two marks
   */
  measure: (name: string, startMark: string, endMark: string): number | null => {
    if (typeof performance !== 'undefined' && performance.measure && performance.getEntriesByName) {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name);
      return entries.length > 0 ? entries[0].duration : null;
    }
    return null;
  },

  /**
   * Clear all performance marks and measures
   */
  clear: (): void => {
    if (typeof performance !== 'undefined') {
      if (performance.clearMarks) performance.clearMarks();
      if (performance.clearMeasures) performance.clearMeasures();
    }
  },
};

/**
 * Memory usage monitoring (development only)
 */
export const memoryUtils = {
  /**
   * Get current memory usage (if available)
   */
  getCurrentUsage: (): any => {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  },

  /**
   * Log memory usage for debugging
   */
  logUsage: (label: string = 'Memory'): void => {
    const memory = memoryUtils.getCurrentUsage();
    if (memory && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log(`${label}:`, {
        used: `${Math.round(memory.usedJSHeapSize / 1048576)} MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1048576)} MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1048576)} MB`,
      });
    }
  },
};
