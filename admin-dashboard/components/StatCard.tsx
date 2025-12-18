import React from 'react';
import GlassCard from './GlassCard';

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: string;
  subtitle?: string;
  className?: string;
}

export default function StatCard({ title, value, icon, subtitle, className = '' }: StatCardProps) {
  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-agricultural-earth mb-2">{title}</p>
          <p className="text-4xl font-bold text-gray-900 mb-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-agricultural-earth">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="w-12 h-12 rounded-xl bg-agricultural-green-light flex items-center justify-center text-2xl">
            {icon}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
