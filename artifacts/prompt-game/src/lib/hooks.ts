import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Error reading from localStorage", error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error("Error setting localStorage", error);
    }
  };

  return [storedValue, setValue] as const;
}

export function useCountdown(timeLimit: number, createdAt: string, onExpire?: () => void) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    if (!createdAt || timeLimit <= 0) return;

    const start = new Date(createdAt).getTime();
    const end = start + timeLimit * 1000;

    const updateTimer = () => {
      const now = new Date().getTime();
      const remain = Math.max(0, Math.ceil((end - now) / 1000));
      setTimeLeft(remain);
      
      if (remain <= 0 && onExpire) {
        onExpire();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [timeLimit, createdAt, onExpire]);

  return timeLeft;
}
