import React, { useState, useEffect } from 'react';
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
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';

const CROP_TYPES = ['MAIZE', 'RED MAIZE', 'WHITE MAIZE', 'RICE', 'BEANS', 'SORGHUM', 'MILLET', 'WHEAT', 'CASSAVA', 'GROUNDNUTS', 'SUNFLOWER', 'OTHER'];

// STAGE 1: Source Category (Maps to BatchSourceType)
const SOURCE_CATEGORIES = [
  { label: 'Own Farm', value: 'OWN_FARM', batchSourceType: 'OWN_FARM' },
  { label: 'SME', value: 'SME', batchSourceType: 'SME' },
  { label: 'Small Farmer', value: 'SMALL_FARMER', batchSourceType: 'SMALL_FARMER' },
  { label: 'Outgrower', value: 'OUTGROWER', batchSourceType: 'OUTGROWER' },
];

// STAGE 2: Outgrower Type (only shown if Category = OUTGROWER)
const OUTGROWER_TYPES = [
  { label: 'Recovery', value: 'RECOVERY' },
  { label: 'Aggregated', value: 'AGGREGATED' },
];

export default function LogInboundScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  
  // STAGE 1: Source Category
  const [sourceCategory, setSourceCategory] = useState('OWN_FARM');
  
  // STAGE 2: Outgrower Type (only if Category = OUTGROWER)
  const [outgrowerType, setOutgrowerType] = useState('');
  
  const [cropType, setCropType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [warehouseSource, setWarehouseSource] = useState(''); // For OWN_FARM
  const [farmerId, setFarmerId] = useState(''); // For OUTGROWER
  const [farmers, setFarmers] = useState<any[]>([]);
  const [showFarmerPicker, setShowFarmerPicker] = useState(false);
  const [serviceRecordId, setServiceRecordId] = useState(''); // For OUTGROWER + RECOVERY
  
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showOutgrowerTypePicker, setShowOutgrowerTypePicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch farmers with outstanding recovery when component mounts
    fetchFarmers();
  }, []);

  const fetchFarmers = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ATTENDANT_FARMERS_WITH_RECOVERY, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setFarmers(data.data);
      }
    } catch (error) {
      console.error('Fetch farmers error:', error);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
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
      mediaTypes: ['images'],
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
    if (!photoUri) {
      Alert.alert('Error', 'Please take a photo for verification');
      return;
    }

    // Source-specific validation
    if (sourceCategory === 'OWN_FARM' && !warehouseSource.trim()) {
      Alert.alert('Error', 'Please enter the source location');
      return;
    }
    if (sourceCategory === 'OUTGROWER' && !outgrowerType) {
      Alert.alert('Error', 'Please select outgrower type (Recovery or Aggregated)');
      return;
    }
    if (sourceCategory === 'OUTGROWER' && outgrowerType === 'RECOVERY' && !farmerId.trim()) {
      Alert.alert('Error', 'Please select a farmer');
      return;
    }
    if (sourceCategory === 'OUTGROWER' && outgrowerType === 'AGGREGATED' && !farmerId.trim()) {
      Alert.alert('Error', 'Please select a farmer');
      return;
    }

    // Build source label
    let sourceLabel = SOURCE_CATEGORIES.find(s => s.value === sourceCategory)?.label || 'Unknown';
    if (sourceCategory === 'OUTGROWER' && outgrowerType) {
      const typeLabel = OUTGROWER_TYPES.find(t => t.value === outgrowerType)?.label;
      sourceLabel = `${sourceLabel} - ${typeLabel}`;
    }

    let confirmMessage = `Log inbound stock?

Source: ${sourceLabel}
Crop: ${cropType}
Quantity: ${quantity} bags
Photo: Attached`;

    if (sourceCategory === 'OWN_FARM') {
      confirmMessage += `\nLocation: ${warehouseSource}`;
    } else if (sourceCategory === 'OUTGROWER' && outgrowerType === 'RECOVERY') {
      const farmerName = farmers.find(f => f.id === farmerId)?.name || 'Unknown';
      confirmMessage += `\nFarmer: ${farmerName} (Recovery)`;
    } else if (sourceCategory === 'OUTGROWER' && outgrowerType === 'AGGREGATED') {
      const farmerName = farmers.find(f => f.id === farmerId)?.name || 'Unknown';
      confirmMessage += `\nFarmer: ${farmerName} (Aggregated)`;
    }

    Alert.alert('Confirm Entry', confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            setIsSubmitting(true);

            // Convert photo URI to base64
            let photoBase64 = '';
            if (photoUri) {
              const response = await fetch(photoUri);
              const blob = await response.blob();
              const reader = new FileReader();
              photoBase64 = await new Promise((resolve) => {
                reader.onloadend = () => {
                  const base64 = reader.result as string;
                  resolve(base64.split(',')[1]); // Remove data:image/jpeg;base64, prefix
                };
                reader.readAsDataURL(blob);
              });
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

            let endpoint = API_ENDPOINTS.ATTENDANT_LOG_INBOUND;
            let body: any = {
              cropType: backendCropType,
              bags: parseInt(quantity),
              photoBase64,
            };

            // Get batchSourceType from source category
            const selectedSource = SOURCE_CATEGORIES.find(s => s.value === sourceCategory);
            const batchSourceType = selectedSource?.batchSourceType || 'OWN_FARM';

            // Route to appropriate endpoint and map to backend enums
            if (sourceCategory === 'OWN_FARM') {
              endpoint = API_ENDPOINTS.ATTENDANT_LOG_INBOUND;
              body.source = warehouseSource;
              body.batchSourceType = batchSourceType;
              body.sourceName = warehouseSource;
            } else if (sourceCategory === 'SME' || sourceCategory === 'SMALL_FARMER') {
              endpoint = API_ENDPOINTS.ATTENDANT_LOG_INBOUND;
              body.source = selectedSource?.label || 'Unknown';
              body.batchSourceType = batchSourceType;
            } else if (sourceCategory === 'OUTGROWER' && outgrowerType === 'RECOVERY') {
              endpoint = API_ENDPOINTS.ATTENDANT_RECOVERY_INBOUND;
              body.farmerId = farmerId;
              body.crop = backendCropType;
              body.bagsReceived = parseInt(quantity);
              body.notes = `Recovery inbound recorded by attendant`;
              delete body.cropType; // Use 'crop' instead
              delete body.bags;
              delete body.photoBase64; // Recovery doesn't require photo
            } else if (sourceCategory === 'OUTGROWER' && outgrowerType === 'AGGREGATED') {
              endpoint = API_ENDPOINTS.ATTENDANT_AGGREGATED_INBOUND;
              body.farmerId = farmerId;
              body.crop = backendCropType;
              body.bags = parseInt(quantity);
              body.notes = `Aggregated inbound recorded by attendant`;
              delete body.cropType; // Use 'crop' instead
              delete body.bagsReceived;
              delete body.photoBase64; // Aggregated doesn't require photo
            }

            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.success || response.ok) {
              Alert.alert('Success', `${sourceLabel} inbound recorded successfully!`, [
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
    ]);
  };

  // Validation
  const isValid = cropType && quantity && parseInt(quantity) > 0 && photoUri && (
    (sourceCategory === 'OWN_FARM' && warehouseSource.trim()) ||
    (sourceCategory === 'SME') ||
    (sourceCategory === 'SMALL_FARMER') ||
    (sourceCategory === 'OUTGROWER' && outgrowerType === 'RECOVERY' && farmerId.trim()) ||
    (sourceCategory === 'OUTGROWER' && outgrowerType === 'AGGREGATED' && farmerId.trim())
  );

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

            {/* STAGE 1: Source Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Source Category *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowCategoryPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerText, !sourceCategory && styles.placeholderText]}>
                  {SOURCE_CATEGORIES.find(s => s.value === sourceCategory)?.label || 'Select source'}
                </Text>
                <Text style={styles.chevron}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* STAGE 2: Outgrower Type (only if OUTGROWER selected) */}
            {sourceCategory === 'OUTGROWER' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Outgrower Type *</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowOutgrowerTypePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerText, !outgrowerType && styles.placeholderText]}>
                    {OUTGROWER_TYPES.find(t => t.value === outgrowerType)?.label || 'Select type'}
                  </Text>
                  <Text style={styles.chevron}>▼</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Own Farm Source Location */}
            {sourceCategory === 'OWN_FARM' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Source Location *</Text>
                <TextInput
                  value={warehouseSource}
                  onChangeText={setWarehouseSource}
                  placeholder="e.g., Farm A, Sector 3"
                  placeholderTextColor="#a8a29e"
                  maxLength={100}
                  style={styles.input}
                />
              </View>
            )}

            {/* SME or Small Farmer Name */}
            {(sourceCategory === 'SME' || sourceCategory === 'SMALL_FARMER') && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Source Name (Optional)</Text>
                <TextInput
                  value={warehouseSource}
                  onChangeText={setWarehouseSource}
                  placeholder={sourceCategory === 'SME' ? 'Enter SME name' : 'Enter farmer name'}
                  placeholderTextColor="#a8a29e"
                  maxLength={100}
                  style={styles.input}
                />
                <Text style={styles.helperText}>
                  {sourceCategory === 'SME' ? 'Name of the SME supplier' : 'Name of the small farmer'}
                </Text>
              </View>
            )}

            {/* Recovery Farmer Selection */}
            {sourceCategory === 'OUTGROWER' && outgrowerType === 'RECOVERY' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Farmer *</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowFarmerPicker(true)}
                >
                  <Text style={[styles.pickerText, !farmerId && styles.placeholderText]}>
                    {farmerId 
                      ? farmers.find(f => f.id === farmerId)?.name || 'Select farmer'
                      : 'Select farmer with outstanding recovery'}
                  </Text>
                  <Text style={styles.chevron}>▼</Text>
                </TouchableOpacity>
                <Text style={styles.helperText}>Recovery inbound will be linked to service record</Text>
              </View>
            )}

            {/* Aggregated Farmer Selection */}
            {sourceCategory === 'OUTGROWER' && outgrowerType === 'AGGREGATED' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Farmer *</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowFarmerPicker(true)}
                >
                  <Text style={[styles.pickerText, !farmerId && styles.placeholderText]}>
                    {farmerId 
                      ? farmers.find(f => f.id === farmerId)?.name || 'Select farmer'
                      : 'Select farmer with outstanding recovery'}
                  </Text>
                  <Text style={styles.chevron}>▼</Text>
                </TouchableOpacity>
                <Text style={styles.helperText}>Owner will enter purchase price later</Text>
              </View>
            )}

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
              disabled={!isValid || isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>Submit Stock Entry</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Source Category Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Source Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={SOURCE_CATEGORIES}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.sourceOption, sourceCategory === item.value && styles.sourceOptionActive]}
                  onPress={() => {
                    setSourceCategory(item.value);
                    // Reset dependent fields
                    setOutgrowerType('');
                    setWarehouseSource('');
                    setServiceRecordId('');
                    setFarmerId('');
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={[styles.sourceOptionText, sourceCategory === item.value && styles.sourceOptionTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.value}
              scrollEnabled={false}
            />
          </View>
        </View>
      </Modal>

      {/* Outgrower Type Modal */}
      <Modal
        visible={showOutgrowerTypePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOutgrowerTypePicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Outgrower Type</Text>
              <TouchableOpacity onPress={() => setShowOutgrowerTypePicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={OUTGROWER_TYPES}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.sourceOption, outgrowerType === item.value && styles.sourceOptionActive]}
                  onPress={() => {
                    setOutgrowerType(item.value);
                    // Reset dependent fields
                    setServiceRecordId('');
                    setFarmerId('');
                    setShowOutgrowerTypePicker(false);
                  }}
                >
                  <Text style={[styles.sourceOptionText, outgrowerType === item.value && styles.sourceOptionTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.value}
              scrollEnabled={false}
            />
          </View>
        </View>
      </Modal>

      {/* Farmer Selection Modal */}
      <Modal
        visible={showFarmerPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFarmerPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Farmer</Text>
              <TouchableOpacity onPress={() => setShowFarmerPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {farmers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No farmers with outstanding recovery</Text>
              </View>
            ) : (
              <FlatList
                data={farmers}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.farmerOption, farmerId === item.id && styles.farmerOptionActive]}
                    onPress={() => {
                      setFarmerId(item.id);
                      setShowFarmerPicker(false);
                    }}
                  >
                    <View>
                      <Text style={[styles.farmerName, farmerId === item.id && styles.farmerNameActive]}>
                        {item.name}
                      </Text>
                      {item.phone && (
                        <Text style={styles.farmerPhone}>{item.phone}</Text>
                      )}
                      {item.community && (
                        <Text style={styles.farmerCommunity}>{item.community}</Text>
                      )}
                    </View>
                    <View style={styles.farmerBadge}>
                      <Text style={styles.farmerBadgeText}>{item.bags_outstanding} bags</Text>
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
              />
            )}
          </View>
        </View>
      </Modal>
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
  helperText: {
    fontSize: 12,
    color: '#78716c',
    marginTop: 4,
    fontStyle: 'italic',
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalClose: {
    fontSize: 24,
    color: '#9ca3af',
  },
  sourceOption: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sourceOptionActive: {
    backgroundColor: '#f0fdf4',
  },
  sourceOptionText: {
    fontSize: 16,
    color: '#4b5563',
  },
  sourceOptionTextActive: {
    color: '#16a34a',
    fontWeight: '600',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#78716c',
  },
  farmerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  farmerOptionActive: {
    backgroundColor: '#dcfce7',
  },
  farmerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 4,
  },
  farmerNameActive: {
    color: '#15803d',
  },
  farmerPhone: {
    fontSize: 13,
    color: '#78716c',
    marginBottom: 2,
  },
  farmerCommunity: {
    fontSize: 12,
    color: '#a8a29e',
  },
  farmerBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  farmerBadgeText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '600',
  },
});
