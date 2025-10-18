import React from 'react';
import { cn } from '../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hover = false }) => {
  return (
    <div
      className={cn(
        'bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6',
        'dark:bg-gray-900/50 dark:border-gray-600/50',
        hover && 'transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20',
        className
      )}
    >
      {children}
    </div>
  );
};
