// src/contexts/ToastContext.tsx
import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import CustomToast from '@/components/ui/toast'; // Your custom Toast component

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
  duration?: number;
}

interface ToastContextType {
  addToast: (message: string, type: 'success' | 'error', duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useAppToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useAppToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error', duration: number = 3000) => {
    const id = Date.now();
    setToasts((prevToasts) => [...prevToasts, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {/* AnimatePresence might be overkill here without more complex entry/exit */}
        {toasts.map((toast) => (
          <CustomToast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};