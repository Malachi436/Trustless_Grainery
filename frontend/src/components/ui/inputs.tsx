import React, { forwardRef } from 'react';
import { View, Text, TextInput as RNTextInput, TextInputProps, Pressable } from 'react-native';
import { cn } from '@/lib/cn';
import { ChevronDown } from '@/lib/icons';

// ============================================
// Text Input Component
// ============================================
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const Input = forwardRef<RNTextInput, InputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    return (
      <View className={cn('mb-4', className)}>
        {label && (
          <Text className="text-sm font-medium text-neutral-700 mb-2">{label}</Text>
        )}
        <View className={cn(
          'flex-row items-center bg-white rounded-xl border px-4',
          error ? 'border-danger-500' : 'border-neutral-200'
        )}>
          {icon && <View className="mr-3">{icon}</View>}
          <RNTextInput
            ref={ref}
            className="flex-1 py-3 text-base text-neutral-800"
            placeholderTextColor="#a8a29e"
            {...props}
          />
        </View>
        {error && (
          <Text className="text-sm text-danger-600 mt-1">{error}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

// ============================================
// Number Input Component (Bags only)
// ============================================
interface NumberInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  maxValue?: number;
}

export function NumberInput({
  label,
  value,
  onChangeText,
  placeholder = 'Enter number of bags',
  error,
  maxValue,
}: NumberInputProps) {
  const handleChange = (text: string) => {
    // Only allow positive integers
    const numeric = text.replace(/[^0-9]/g, '');
    if (maxValue && parseInt(numeric) > maxValue) {
      return;
    }
    onChangeText(numeric);
  };

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-neutral-700 mb-2">{label}</Text>
      <RNTextInput
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor="#a8a29e"
        keyboardType="number-pad"
        className={cn(
          'bg-white rounded-xl border px-4 py-3 text-base text-neutral-800',
          error ? 'border-danger-500' : 'border-neutral-200'
        )}
      />
      {error && (
        <Text className="text-sm text-danger-600 mt-1">{error}</Text>
      )}
    </View>
  );
}

// ============================================
// Select/Picker Component
// ============================================
interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  error,
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-neutral-700 mb-2">{label}</Text>
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        className={cn(
          'bg-white rounded-xl border px-4 py-3 flex-row items-center justify-between',
          error ? 'border-danger-500' : 'border-neutral-200'
        )}
      >
        <Text className={cn(
          'text-base',
          selectedOption ? 'text-neutral-800' : 'text-neutral-400'
        )}>
          {selectedOption?.label || placeholder}
        </Text>
        <ChevronDown size={20} color="#78716c" />
      </Pressable>
      
      {isOpen && (
        <View className="mt-2 bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'px-4 py-3 border-b border-neutral-100',
                option.value === value && 'bg-primary-50'
              )}
            >
              <Text className={cn(
                'text-base',
                option.value === value ? 'text-primary-600 font-medium' : 'text-neutral-700'
              )}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      
      {error && (
        <Text className="text-sm text-danger-600 mt-1">{error}</Text>
      )}
    </View>
  );
}
