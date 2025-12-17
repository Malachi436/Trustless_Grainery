import React, { useState } from 'react';
import { View, Text, Pressable, Image as RNImage, ActivityIndicator } from 'react-native';
import { Camera } from '@/lib/icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { cn } from '@/lib/cn';
import { Button } from './core';
import { Modal } from 'react-native';

// ============================================
// Photo Capture Button
// ============================================
interface PhotoCaptureButtonProps {
  onPhotoTaken: (uri: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

export function PhotoCaptureButton({
  onPhotoTaken,
  label = 'Photo Evidence',
  required = true,
  className,
}: PhotoCaptureButtonProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = React.useRef<CameraView>(null);

  const handleCapture = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        return;
      }
    }
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (photo) {
        onPhotoTaken(photo.uri);
        setShowCamera(false);
      }
    }
  };

  return (
    <>
      <View className={cn('mb-4', className)}>
        <Text className="text-sm font-medium text-neutral-700 mb-2">
          {label}
          {required && <Text className="text-danger-500"> *</Text>}
        </Text>
        <Pressable
          onPress={handleCapture}
          className="bg-primary-50 border-2 border-dashed border-primary-300 rounded-xl p-8 items-center justify-center"
        >
          <View className="w-16 h-16 rounded-full bg-primary-100 items-center justify-center mb-3">
            <Camera size={32} color="#3d9448" />
          </View>
          <Text className="text-base font-medium text-primary-700">
            Tap to capture photo
          </Text>
          <Text className="text-sm text-primary-600 mt-1">
            Required for verification
          </Text>
        </Pressable>
      </View>

      {showCamera && (
        <Modal visible={showCamera} animationType="slide">
          <View style={{ flex: 1 }}>
            <CameraView
              ref={cameraRef}
              style={{ flex: 1 }}
              facing="back"
            >
              <View className="flex-1 justify-end p-6">
                <View className="flex-row justify-between items-center">
                  <Button
                    onPress={() => setShowCamera(false)}
                    variant="ghost"
                    className="bg-white/90"
                  >
                    Cancel
                  </Button>
                  <Pressable
                    onPress={takePicture}
                    className="w-20 h-20 rounded-full bg-white border-4 border-primary-500"
                  />
                  <View style={{ width: 80 }} />
                </View>
              </View>
            </CameraView>
          </View>
        </Modal>
      )}
    </>
  );
}

// ============================================
// Photo Preview Component
// ============================================
interface PhotoPreviewProps {
  uri: string;
  onRemove?: () => void;
  className?: string;
}

export function PhotoPreview({ uri, onRemove, className }: PhotoPreviewProps) {
  const [loading, setLoading] = useState(true);

  return (
    <View className={cn('relative', className)}>
      <View className="rounded-xl overflow-hidden bg-neutral-100">
        <RNImage
          source={{ uri }}
          className="w-full h-48"
          resizeMode="cover"
          onLoadEnd={() => setLoading(false)}
        />
        {loading && (
          <View className="absolute inset-0 items-center justify-center">
            <ActivityIndicator size="large" color="#3d9448" />
          </View>
        )}
      </View>
      {onRemove && (
        <Pressable
          onPress={onRemove}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-danger-500 items-center justify-center"
        >
          <Text className="text-white font-bold">×</Text>
        </Pressable>
      )}
    </View>
  );
}

// ============================================
// Photo Capture With Preview
// ============================================
interface PhotoCaptureWithPreviewProps {
  photoUri: string | null;
  onPhotoTaken: (uri: string) => void;
  onPhotoRemove: () => void;
  label?: string;
  required?: boolean;
}

export function PhotoCaptureWithPreview({
  photoUri,
  onPhotoTaken,
  onPhotoRemove,
  label,
  required,
}: PhotoCaptureWithPreviewProps) {
  if (photoUri) {
    return (
      <View className="mb-4">
        {label && (
          <Text className="text-sm font-medium text-neutral-700 mb-2">
            {label}
            {required && <Text className="text-danger-500"> *</Text>}
          </Text>
        )}
        <PhotoPreview uri={photoUri} onRemove={onPhotoRemove} />
      </View>
    );
  }

  return (
    <PhotoCaptureButton
      onPhotoTaken={onPhotoTaken}
      label={label}
      required={required}
    />
  );
}
