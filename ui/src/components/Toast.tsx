import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  message: string | null;
  type?: 'success' | 'info' | 'error';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  onClose,
  duration = 3500,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const config =
    type === 'error'
      ? {
          bg: '#181214',
          border: 'rgba(239, 68, 68, 0.3)',
          text: '#fca5a5',
          Icon: AlertCircle,
        }
      : type === 'info'
      ? {
          bg: '#12161f',
          border: 'rgba(56, 189, 248, 0.3)',
          text: '#7dd3fc',
          Icon: Info,
        }
      : {
          bg: '#101a15',
          border: 'rgba(16, 185, 129, 0.3)',
          text: '#6ee7b7',
          Icon: CheckCircle2,
        };

  const IconComponent = config.Icon;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.text,
        padding: '10px 14px',
        borderRadius: '8px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12.5px',
        fontWeight: 500,
        fontFamily: 'var(--font-sans)',
        animation: 'modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <IconComponent size={15} strokeWidth={1.5} style={{ flexShrink: 0 }} />
      <span>{message}</span>
      <button
        onClick={onClose}
        aria-label="Cerrar notificación"
        style={{
          background: 'transparent',
          border: 'none',
          color: config.text,
          opacity: 0.65,
          cursor: 'pointer',
          padding: '2px',
          marginLeft: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={13} strokeWidth={1.5} />
      </button>
    </div>
  );
};
