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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';

const CROP_TYPES = ['MAIZE', 'RED MAIZE', 'WHITE MAIZE', 'RICE', 'BEANS', 'SORGHUM', 'MILLET', 'WHEAT', 'CASSAVA', 'GROUNDNUTS', 'SUNFLOWER', 'OTHER'];

export default function RequestDispatchScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [cropType, setCropType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log('RequestDispatchScreen rendering...');
  console.log('Current state:', { cropType, quantity, notes });

  const handleSubmit = () => {
    if (!cropType) {
      Alert.alert('Error', 'Please select a crop type');
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    // Map cropType to backend format (capitalized: Maize, Rice, etc.)
    const cropTypeMap: Record<string, string> = {
      'maize': 'Maize',
      'red maize': 'Maize',
      'white maize': 'Maize',
      'rice': 'Rice',
      'soybeans': 'Soybeans',
      'beans': 'Soybeans',
      'wheat': 'Wheat',
      'millet': 'Millet',
      'sorghum': 'Millet',
      'cassava': 'Cassava',
      'groundnuts': 'Groundnuts',
      'sunflower': 'Sunflower',
      'other': 'Other',
    };
    const backendCropType = cropTypeMap[cropType.toLowerCase()] || 'Maize';

    Alert.alert(
      'Submit Request',
      `Send dispatch request to owner?

Crop: ${cropType}
Quantity: ${quantity} bags${notes ? `\nNote: ${notes}` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              
              console.log('Sending request to:', API_ENDPOINTS.ATTENDANT_REQUEST_DISPATCH);
              console.log('Request body:', {
                cropType: backendCropType,
                bags: parseInt(quantity),
                recipientName: 'TBD',
                notes: notes || undefined,
              });
              
              const response = await fetch(API_ENDPOINTS.ATTENDANT_REQUEST_DISPATCH, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  cropType: backendCropType,
                  bags: parseInt(quantity),
                  recipientName: 'TBD',
                  notes: notes || undefined,
                }),
              });

              console.log('Response status:', response.status);
              const data = await response.json();
              console.log('Response data:', data);

              if (data.success) {
                Alert.alert(
                  'Request Submitted',
                  'Your dispatch request has been sent to the owner. The owner will add buyer details and approve.',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.back(),
                    },
                  ]
                );
              } else {
                throw new Error(data.error || 'Failed to submit request');
              }
            } catch (error: any) {
              console.error('Request dispatch error:', error);
              Alert.alert('Error', error.message || 'Failed to submit dispatch request');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const isValid = cropType && quantity && parseInt(quantity) > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f4" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Request Dispatch</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Info Banner */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Request Dispatch</Text>
            <Text style={styles.infoText}>Submit a generic dispatch request</Text>
          </View>

          {/* Owner Notice */}
          <View style={styles.ownerNotice}>
            <Text style={styles.ownerNoticeTitle}>ℹ️ Owner Will Complete</Text>
            <Text style={styles.ownerNoticeText}>
              You only need to specify crop and quantity. The owner will add buyer details, batch allocation, and payment terms during approval.
            </Text>
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

            {/* Optional Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes for the owner..."
                placeholderTextColor="#a8a29e"
                multiline
                numberOfLines={3}
                maxLength={200}
                style={[styles.input, styles.textArea]}
              />
            </View>

            {/* Approval Notice */}
            <View style={styles.noticeBox}>
              <Text style={styles.noticeTitle}>Owner Approval Required</Text>
              <Text style={styles.noticeText}>
                The owner will review this request and add:
                {`\n`}• Buyer details and contact{`\n`}• Batch selection{`\n`}• Payment terms and pricing
              </Text>
            </View>

            {/* Info Notice */}
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                Once approved, you'll receive a notification to execute the dispatch
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!isValid}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>Submit for Approval</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f4',
  },
  safeArea: {
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
  ownerNotice: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  ownerNoticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 6,
  },
  ownerNoticeText: {
    fontSize: 13,
    color: '#1e3a8a',
    lineHeight: 18,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
});
