import React, { createContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContext = createContext();

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          let bgColor, textColor, Icon;
          switch (toast.type) {
            case 'success':
              bgColor = 'bg-emerald-50 border-emerald-200';
              textColor = 'text-emerald-700';
              Icon = CheckCircle;
              break;
            case 'error':
              bgColor = 'bg-red-50 border-red-200';
              textColor = 'text-red-700';
              Icon = AlertCircle;
              break;
            default:
              bgColor = 'bg-blue-50 border-blue-200';
              textColor = 'text-blue-700';
              Icon = Info;
          }

          return (
            <div 
              key={toast.id} 
              className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg pointer-events-auto animate-fade-in ${bgColor} ${textColor} w-80`}
            >
              <Icon size={20} className="mt-0.5 shrink-0" />
              <div className="flex-1 text-sm font-medium">{toast.message}</div>
              <button 
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
