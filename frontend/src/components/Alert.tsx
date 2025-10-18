import React from 'react';
import { AlertTriangle, X, CheckCircle, Info } from 'lucide-react';
import { cn } from '../utils/cn';

interface AlertProps {
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type,
  title,
  message,
  onClose,
  className
}) => {
  const icons = {
    error: AlertTriangle,
    warning: AlertTriangle,
    success: CheckCircle,
    info: Info,
  };

  const styles = {
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };

  const Icon = icons[type];

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        styles[type],
        className
      )}
    >
      <div className="flex items-start">
        <Icon className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{title}</h3>
          <p className="text-sm opacity-90">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-3 p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
