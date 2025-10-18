import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../utils/cn';

interface Step {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
}

interface StepIndicatorProps {
  steps: Step[];
  className?: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, className }) => {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                step.completed
                  ? 'bg-gradient-to-r from-purple-500 to-teal-500 text-white'
                  : step.active
                  ? 'bg-purple-500 text-white ring-4 ring-purple-500/20'
                  : 'bg-gray-700 text-gray-400'
              )}
            >
              {step.completed ? (
                <Check className="w-6 h-6" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <div className="mt-2 text-center">
              <h3 className="text-sm font-medium text-white">{step.title}</h3>
              <p className="text-xs text-gray-400 mt-1">{step.description}</p>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 mx-4 transition-colors duration-300',
                step.completed ? 'bg-gradient-to-r from-purple-500 to-teal-500' : 'bg-gray-700'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};
