import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { cn } from '@/lib/cn';

// ============================================
// Glass Card Component
// ============================================
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}

export function GlassCard({ children, className, intensity = 40 }: GlassCardProps) {
  return (
    <View className={cn('overflow-hidden rounded-2xl', className)}>
      <BlurView
        intensity={intensity}
        tint="light"
        style={{
          padding: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.3)',
          borderRadius: 16,
        }}
      >
        {children}
      </BlurView>
    </View>
  );
}

// ============================================
// Button Component
// ============================================
interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className,
  icon,
}: ButtonProps) {
  const baseStyles = 'flex-row items-center justify-center rounded-xl';

  const variantStyles = {
    primary: 'bg-primary-600 active:bg-primary-700',
    secondary: 'bg-sand-200 active:bg-sand-300',
    danger: 'bg-danger-500 active:bg-danger-600',
    ghost: 'bg-transparent active:bg-neutral-100',
  };

  const textVariantStyles = {
    primary: 'text-white font-semibold',
    secondary: 'text-neutral-800 font-medium',
    danger: 'text-white font-semibold',
    ghost: 'text-neutral-700 font-medium',
  };

  const sizeStyles = {
    sm: 'px-4 py-2',
    md: 'px-6 py-3',
    lg: 'px-8 py-4',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && 'opacity-50',
        className
      )}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#fff' : '#44403c'}
        />
      ) : (
        <>
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={cn(textVariantStyles[variant], textSizeStyles[size])}>
            {children}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// ============================================
// Badge Component
// ============================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variantStyles = {
    default: 'bg-neutral-200',
    success: 'bg-success-100',
    warning: 'bg-sand-200',
    danger: 'bg-danger-100',
    info: 'bg-primary-100',
  };

  const textStyles = {
    default: 'text-neutral-700',
    success: 'text-success-600',
    warning: 'text-sand-700',
    danger: 'text-danger-600',
    info: 'text-primary-700',
  };

  return (
    <View className={cn('px-3 py-1 rounded-full', variantStyles[variant], className)}>
      <Text className={cn('text-xs font-medium', textStyles[variant])}>{children}</Text>
    </View>
  );
}

// ============================================
// Section Header Component
// ============================================
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View className="mb-4 flex-row items-center justify-between">
      <View className="flex-1">
        <Text className="text-lg font-semibold text-neutral-800">{title}</Text>
        {subtitle && <Text className="text-sm text-neutral-500 mt-1">{subtitle}</Text>}
      </View>
      {action && <View>{action}</View>}
    </View>
  );
}

// ============================================
// Empty State Component
// ============================================
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
}

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <View className="items-center justify-center py-12 px-6">
      {icon && <View className="mb-4 opacity-50">{icon}</View>}
      <Text className="text-lg font-medium text-neutral-600 text-center">{title}</Text>
      <Text className="text-sm text-neutral-400 text-center mt-2">{message}</Text>
    </View>
  );
}

// ============================================
// Divider Component
// ============================================
interface DividerProps {
  className?: string;
}

export function Divider({ className }: DividerProps) {
  return <View className={cn('h-px bg-neutral-200 my-4', className)} />;
}

// ============================================
// Stale Data Indicator
// ============================================
interface StaleDataIndicatorProps {
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function StaleDataIndicator({
  lastUpdated,
  onRefresh,
  isRefreshing,
}: StaleDataIndicatorProps) {
  const now = new Date();
  const updated = new Date(lastUpdated);
  const diffMinutes = Math.floor((now.getTime() - updated.getTime()) / 60000);

  if (diffMinutes < 5) return null;

  return (
    <View className="mb-4 bg-sand-100 rounded-xl p-3 flex-row items-center justify-between">
      <Text className="text-sm text-sand-700 flex-1">
        Data is {diffMinutes} minutes old
      </Text>
      <Pressable onPress={onRefresh} disabled={isRefreshing} className="px-3 py-1">
        <Text className="text-sm font-medium text-primary-600">
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Text>
      </Pressable>
    </View>
  );
}
