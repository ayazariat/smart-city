import React, { ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

interface AlertProps {
  variant?: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

/**
 * Composant Alert avec la palette Tunis Vert Civique
 * error = Rouge Tunis (Urgent)
 * success = Vert Clair (Succès)
 * warning = Orange (Attention)
 * info = Vert Émeraude (Primaire)
 */
export const Alert: React.FC<AlertProps> = ({ 
  variant = 'info', 
  title, 
  children, 
  onClose 
}) => {
  const variants = {
    error: {
      container: 'bg-urgent-50 border-urgent-200 text-urgent-800',
      icon: <XCircle size={20} className="text-urgent-600 flex-shrink-0" />,
      title: 'text-urgent-900'
    },
    success: {
      container: 'bg-success-50 border-success-200 text-success-800',
      icon: <CheckCircle size={20} className="text-success-600 flex-shrink-0" />,
      title: 'text-success-900'
    },
    warning: {
      container: 'bg-attention-50 border-attention-200 text-attention-800',
      icon: <AlertCircle size={20} className="text-attention-600 flex-shrink-0" />,
      title: 'text-attention-900'
    },
    info: {
      container: 'bg-primary-50 border-primary-200 text-primary-800',
      icon: <Info size={20} className="text-primary-600 flex-shrink-0" />,
      title: 'text-primary-900'
    }
  };

  const config = variants[variant];

  return (
    <div className={`border rounded-lg p-4 ${config.container} transition-all duration-300`}>
      <div className="flex gap-3">
        {config.icon}
        <div className="flex-1">
          {title && (
            <h4 className={`font-semibold mb-1 ${config.title}`}>{title}</h4>
          )}
          <div className="text-sm">{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-current opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
            aria-label="Fermer"
          >
            <XCircle size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
