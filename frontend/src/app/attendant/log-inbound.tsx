import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';

const CROP_TYPES = ['Maize', 'Rice', 'Soybeans', 'Wheat', 'Millet'];

export default function LogInboundScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [cropType, setCropType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [source, setSource] = useState('');
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleChoosePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Gallery access is needed to choose photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!cropType) {
      Alert.alert('Error', 'Please select a crop type');
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }
    if (!source.trim()) {
      Alert.alert('Error', 'Please enter the source location');
      return;
    }
    if (!photoUri) {
      Alert.alert('Error', 'Please take a photo for verification');
      return;
    }

    Alert.alert(
      'Confirm Entry',
      `Log inbound stock?

Crop: ${cropType}
Quantity: ${quantity} bags
Source: ${source}
Photo: Attached`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              
              const response = await fetch(API_ENDPOINTS.ATTENDANT_LOG_INBOUND, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  cropType: cropType.toLowerCase(),
                  bags: parseInt(quantity),
                  source,
                  photoProof: photoUri,
                }),
              });

              const data = await response.json();

              if (data.success) {
                Alert.alert('Success', 'Stock entry logged successfully!', [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]);
              } else {
                throw new Error(data.error || 'Failed to log inbound');
              }
            } catch (error: any) {
              console.error('Log inbound error:', error);
              Alert.alert('Error', error.message || 'Failed to log inbound stock');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const isValid = cropType && quantity && parseInt(quantity) > 0 && source.trim() && photoUri;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f4" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Stock</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Info Banner */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Inbound Stock Entry</Text>
            <Text style={styles.infoText}>Record new stock arriving at the warehouse</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Crop Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Crop Type</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowCropPicker(!showCropPicker)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerText, !cropType && styles.placeholderText]}>
                  {cropType || 'Select crop type'}
                </Text>
                <Text style={styles.chevron}>{showCropPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {/* Crop Picker */}
              {showCropPicker && (
                <View style={styles.pickerDropdown}>
                  {CROP_TYPES.map((crop) => (
                    <TouchableOpacity
                      key={crop}
                      style={[
                        styles.pickerOption,
                        cropType === crop && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setCropType(crop);
                        setShowCropPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          cropType === crop && styles.pickerOptionTextSelected,
                        ]}
                      >
                        {crop}
                      </Text>
                      {cropType === crop && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Quantity */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Number of Bags</Text>
              <TextInput
                value={quantity}
                onChangeText={(text) => setQuantity(text.replace(/[^0-9]/g, ''))}
                placeholder="Enter quantity"
                placeholderTextColor="#a8a29e"
                keyboardType="number-pad"
                maxLength={6}
                style={styles.input}
              />
            </View>

            {/* Source */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Source</Text>
              <TextInput
                value={source}
                onChangeText={setSource}
                placeholder="e.g., Farm A - North Field"
                placeholderTextColor="#a8a29e"
                maxLength={100}
                style={styles.input}
              />
            </View>

            {/* Photo Evidence */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Photo Evidence</Text>
              
              {photoUri ? (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                  <View style={styles.photoActions}>
                    <TouchableOpacity
                      style={styles.photoActionButton}
                      onPress={handleTakePhoto}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.photoActionText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoActionButton, styles.removeButton]}
                      onPress={() => setPhotoUri(null)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.photoActionText, styles.removeText]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.photoButtons}>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={handleTakePhoto}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.photoButtonIcon}>📷</Text>
                    <Text style={styles.photoButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={handleChoosePhoto}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.photoButtonIcon}>🖼️</Text>
                    <Text style={styles.photoButtonText}>Choose from Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Notice */}
            <View style={styles.noticeBox}>
              <Text style={styles.noticeTitle}>Required</Text>
              <Text style={styles.noticeText}>
                Photo verification is required before submission
              </Text>
            </View>

            {/* Info Notice */}
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                Owner will be notified when this entry is submitted
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!isValid}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>Submit Stock Entry</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f4',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#1c1917',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1917',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 15,
    color: '#78716c',
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1c1917',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerText: {
    fontSize: 16,
    color: '#1c1917',
  },
  placeholderText: {
    color: '#a8a29e',
  },
  chevron: {
    fontSize: 12,
    color: '#78716c',
  },
  pickerDropdown: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  pickerOptionSelected: {
    backgroundColor: '#e8f3ea',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1c1917',
  },
  pickerOptionTextSelected: {
    fontWeight: '600',
    color: '#3d9448',
  },
  checkmark: {
    fontSize: 16,
    color: '#3d9448',
    fontWeight: '700',
  },
  noticeBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    color: '#78716c',
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: '#e8f3ea',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#3d9448',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#3d9448',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#3d9448',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#d6d3d1',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#3d9448',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3d9448',
  },
  photoContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  photoActionButton: {
    flex: 1,
    backgroundColor: '#3d9448',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  removeButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  removeText: {
    color: '#dc2626',
  },
});
