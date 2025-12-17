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

const CROP_TYPES = ['Maize', 'Rice', 'Soybeans', 'Wheat', 'Millet'];

export default function RequestDispatchScreen() {
  const router = useRouter();
  const [cropType, setCropType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [showCropPicker, setShowCropPicker] = useState(false);

  console.log('RequestDispatchScreen rendering...');
  console.log('Current state:', { cropType, quantity, buyerName, buyerPhone });

  const handleSubmit = () => {
    if (!cropType) {
      Alert.alert('Error', 'Please select a crop type');
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }
    if (!buyerName.trim()) {
      Alert.alert('Error', 'Please enter buyer name');
      return;
    }
    if (!buyerPhone.trim()) {
      Alert.alert('Error', 'Please enter buyer phone number');
      return;
    }

    Alert.alert(
      'Submit Request',
      `Send dispatch request to owner?

Crop: ${cropType}
Quantity: ${quantity} bags
Buyer: ${buyerName}
Phone: ${buyerPhone}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: () => {
            Alert.alert(
              'Request Submitted',
              'Your dispatch request has been sent to the owner for approval. You will be notified once approved.',
              [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]
            );
          },
        },
      ]
    );
  };

  const isValid = cropType && quantity && parseInt(quantity) > 0 && buyerName.trim() && buyerPhone.trim();

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
            <Text style={styles.infoTitle}>Sale Request</Text>
            <Text style={styles.infoText}>Create dispatch request for owner approval</Text>
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

            {/* Buyer Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Buyer Name</Text>
              <TextInput
                value={buyerName}
                onChangeText={setBuyerName}
                placeholder="Enter buyer's full name"
                placeholderTextColor="#a8a29e"
                maxLength={100}
                style={styles.input}
              />
            </View>

            {/* Buyer Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Buyer Phone</Text>
              <TextInput
                value={buyerPhone}
                onChangeText={setBuyerPhone}
                placeholder="Enter phone number"
                placeholderTextColor="#a8a29e"
                keyboardType="phone-pad"
                maxLength={20}
                style={styles.input}
              />
            </View>

            {/* Approval Notice */}
            <View style={styles.noticeBox}>
              <Text style={styles.noticeTitle}>Approval Required</Text>
              <Text style={styles.noticeText}>
                This dispatch request will be sent to the owner for approval. You cannot proceed until approved.
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
});
