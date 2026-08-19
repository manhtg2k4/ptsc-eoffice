import { useRef, useEffect } from "react";

export default function useDebounce(fn, delay) {
  const timeoutRef = useRef();

  function debouncedFunction(...args) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fn(...args);
    }, delay);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return debouncedFunction;
}
