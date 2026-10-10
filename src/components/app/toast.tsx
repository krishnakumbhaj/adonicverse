'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';

// Spotify-style toast: a small pill at the bottom center, e.g. "Saved to Your Library".

type Toast = { id: number; message: string; tone: 'info' | 'error' };
type ToastApi = { toast: (message: string, tone?: Toast['tone']) => void };

const ToastContext = createContext<ToastApi>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = ++nextId.current;
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-36 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-24"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`animate-in fade-in slide-in-from-bottom-2 rounded-lg px-4 py-3 text-sm font-semibold shadow-2xl shadow-black/50 ${
              item.tone === 'error' ? 'bg-pal-danger text-black' : 'bg-pal-text text-pal-base'
            }`}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
