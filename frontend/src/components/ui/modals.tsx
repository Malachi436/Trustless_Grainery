import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { AlertCircle, Info, AlertTriangle, X } from '@/lib/icons';
import { Button } from './core';

// ============================================
// Base Modal Component
// ============================================
interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

function BaseModal({ visible, onClose, children, title }: BaseModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        className="flex-1 justify-center items-center bg-black/50"
        onPress={onClose}
      >
        <Pressable 
          className="w-11/12 max-w-md"
          onPress={(e) => e.stopPropagation()}
        >
          <BlurView
            intensity={60}
            tint="light"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-neutral-800 flex-1">{title}</Text>
              <Pressable onPress={onClose} className="w-8 h-8 items-center justify-center">
                <X size={24} color="#78716c" />
              </Pressable>
            </View>
            {children}
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================
// Confirmation Modal
// ============================================
interface ConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'info' | 'warning' | 'danger';
  loading?: boolean;
}

export function ConfirmationModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  loading = false,
}: ConfirmationModalProps) {
  const icons = {
    info: <Info size={48} color="#3d9448" />,
    warning: <AlertTriangle size={48} color="#b89974" />,
    danger: <AlertCircle size={48} color="#b91c1c" />,
  };

  const buttonVariants = {
    info: 'primary' as const,
    warning: 'secondary' as const,
    danger: 'danger' as const,
  };

  return (
    <BaseModal visible={visible} onClose={onClose} title={title}>
      <View className="items-center mb-6">
        {icons[variant]}
        <Text className="text-base text-neutral-600 text-center mt-4">{message}</Text>
      </View>
      <View className="flex-row gap-3">
        <Button
          onPress={onClose}
          variant="ghost"
          className="flex-1"
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          onPress={onConfirm}
          variant={buttonVariants[variant]}
          className="flex-1"
          loading={loading}
        >
          {confirmText}
        </Button>
      </View>
    </BaseModal>
  );
}

// ============================================
// Info Modal
// ============================================
interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: React.ReactNode;
}

export function InfoModal({ visible, onClose, title, message, icon }: InfoModalProps) {
  return (
    <BaseModal visible={visible} onClose={onClose} title={title}>
      <View className="items-center mb-6">
        {icon || <Info size={48} color="#3d9448" />}
        <Text className="text-base text-neutral-600 text-center mt-4">{message}</Text>
      </View>
      <Button onPress={onClose} variant="primary">
        Got it
      </Button>
    </BaseModal>
  );
}

// ============================================
// Critical Action Modal (for irreversible actions)
// ============================================
interface CriticalActionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  actionDescription: string;
  confirmText?: string;
  loading?: boolean;
}

export function CriticalActionModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  actionDescription,
  confirmText = 'I Understand, Proceed',
  loading = false,
}: CriticalActionModalProps) {
  return (
    <BaseModal visible={visible} onClose={onClose} title={title}>
      <View className="mb-6">
        <View className="items-center mb-4">
          <AlertCircle size={56} color="#b91c1c" />
        </View>
        
        <Text className="text-base text-neutral-700 text-center mb-4">{message}</Text>
        
        <View className="bg-danger-50 border border-danger-200 rounded-xl p-4">
          <Text className="text-sm font-medium text-danger-700 text-center">
            {actionDescription}
          </Text>
        </View>
      </View>
      
      <View className="flex-row gap-3">
        <Button
          onPress={onClose}
          variant="ghost"
          className="flex-1"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onPress={onConfirm}
          variant="danger"
          className="flex-1"
          loading={loading}
        >
          {confirmText}
        </Button>
      </View>
    </BaseModal>
  );
}
