import { useCallback } from 'react';
export function useSleep() {
  const sleep = useCallback((ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }, []);

  return sleep;
}
