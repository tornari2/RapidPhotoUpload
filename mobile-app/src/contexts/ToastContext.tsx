import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from '../components/Toast/Toast';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'error' | 'info'>('success');
  const [duration, setDuration] = useState(3000);

  const showToast = useCallback(
    (msg: string, toastType: 'success' | 'error' | 'info' = 'success', toastDuration = 3000) => {
      setMessage(msg);
      setType(toastType);
      setDuration(toastDuration);
      setVisible(true);
    },
    []
  );

  const handleHide = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        visible={visible}
        message={message}
        type={type}
        duration={duration}
        onHide={handleHide}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

