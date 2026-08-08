import type { ToastItem } from '../../types';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast toast-${toast.status_level}`}
          onClick={() => onDismiss(toast.id)}
          role="alert"
        >
          <span className="toast-icon">
            {toast.status_level === 'alert' ? '🔴' : '🟡'}
          </span>
          <div className="toast-body">
            <div className="toast-title">
              {toast.status_level === 'alert' ? '⚠ CRITICAL ALERT' : '⚠ WARNING'}
            </div>
            <div className="toast-msg">
              <strong>{toast.node_id}</strong> — {toast.resource_type.toUpperCase()} at{' '}
              <strong>{(toast.metric_value * 100).toFixed(1)}%</strong>
            </div>
            <div style={{ fontSize: '0.7rem', marginTop: 4, opacity: 0.6 }}>
              {toast.message} · click to dismiss
            </div>
          </div>
          <button className="toast-close" onClick={e => { e.stopPropagation(); onDismiss(toast.id); }} aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>
  );
}
