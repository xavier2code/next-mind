'use client';

import { Loader2, CheckCircle, XCircle, Circle, CircleSlash } from 'lucide-react';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface TaskStatusIconProps {
  status: TaskStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export function TaskStatusIcon({ status, size = 'md', className = '' }: TaskStatusIconProps) {
  const sizeClass = sizeClasses[size];

  switch (status) {
    case 'pending':
      return <Circle className={`${sizeClass} text-gray-400 ${className}`} />;
    case 'running':
      return <Loader2 className={`${sizeClass} text-blue-500 animate-spin ${className}`} />;
    case 'completed':
      return <CheckCircle className={`${sizeClass} text-green-500 ${className}`} />;
    case 'failed':
      return <XCircle className={`${sizeClass} text-red-500 ${className}`} />;
    case 'cancelled':
      return <CircleSlash className={`${sizeClass} text-gray-400 ${className}`} />;
    default:
      return <Circle className={`${sizeClass} text-gray-400 ${className}`} />;
  }
}
