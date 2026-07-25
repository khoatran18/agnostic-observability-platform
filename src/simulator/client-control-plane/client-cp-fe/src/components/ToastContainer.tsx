import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastMessage } from '../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="floating-toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`floating-toast ${t.type}`}>
          <div className="toast-icon">
            {t.type === 'success' && <CheckCircle2 size={20} />}
            {t.type === 'error' && <AlertTriangle size={20} />}
            {t.type === 'info' && <Info size={20} />}
          </div>

          <div className="toast-content">
            <div className="toast-title">{t.title}</div>
            <div className="toast-message">{t.message}</div>
          </div>

          <button
            className="toast-close-btn"
            onClick={() => onDismiss(t.id)}
            title="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
