import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div className={`glass-card rounded-2xl shadow-lg ${className}`}>
      {children}
    </div>
  );
}
