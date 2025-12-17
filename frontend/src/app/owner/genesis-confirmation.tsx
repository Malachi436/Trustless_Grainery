import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { CropType } from '@/lib/types';

type GenesisItem = {
  cropType: CropType;
  bags: number;
};

const CROP_OPTIONS: { value: CropType; label: string }[] = [
  { value: 'maize', label: 'Maize' },
  { value: 'rice', label: 'Rice' },
  { value: 'wheat', label: 'Wheat' },
  { value: 'sorghum', label: 'Sorghum' },
  { value: 'barley', label: 'Barley' },
  { value: 'millet', label: 'Millet' },
  { value: 'soybeans', label: 'Soybeans' },
];

export default function GenesisConfirmationScreen() {
  const router = useRouter();
  const { user, warehouse } = useAuthStore();
  const [inventory, setInventory] = useState<GenesisItem[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<CropType>('maize');
  const [bags, setBags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCrop = () => {
    if (!bags || parseInt(bags) <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of bags');
      return;
    }

    const existingIndex = inventory.findIndex(item => item.cropType === selectedCrop);
    
    if (existingIndex >= 0) {
      Alert.alert('Crop Already Added', 'This crop type is already in the list. Remove it first to change the quantity.');
      return;
    }

    setInventory([...inventory, { cropType: selectedCrop, bags: parseInt(bags) }]);
    setBags('');
  };

  const handleRemoveCrop = (cropType: CropType) => {
    setInventory(inventory.filter(item => item.cropType !== cropType));
  };

  const totalBags = inventory.reduce((sum, item) => sum + item.bags, 0);

  const handleConfirmGenesis = async () => {
    if (inventory.length === 0) {
      Alert.alert('No Inventory', 'Please add at least one crop type to confirm genesis');
      return;
    }

    Alert.alert(
      'Confirm Genesis Inventory',
      `You are about to record the initial inventory:

${inventory.map(item => `${getCropLabel(item.cropType)}: ${item.bags} bags`).join('
')}

Total: ${totalBags} bags

This action cannot be undone. Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'default',
          onPress: submitGenesis,
        },
      ]
    );
  };

  const submitGenesis = async () => {
    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      const response = await fetch('http://localhost:4000/api/owner/genesis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`, // TODO: Use actual JWT token from auth store
        },
        body: JSON.stringify({
          inventory: inventory.map(item => ({
            cropType: item.cropType,
            bags: item.bags,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Genesis Confirmed!',
          'Initial inventory has been recorded successfully. Your warehouse is now active.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/owner'),
            },
          ]
        );
      } else {
        throw new Error(data.error || 'Failed to confirm genesis');
      }
    } catch (error) {
      console.error('Genesis confirmation failed:', error);
      Alert.alert(
        'Error',
        'Failed to confirm genesis inventory. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCropLabel = (cropType: CropType) => {
    return CROP_OPTIONS.find(c => c.value === cropType)?.label || cropType;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Genesis Confirmation</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.content}>
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerIcon}>🌾</Text>
              <View style={styles.infoBannerContent}>
                <Text style={styles.infoBannerTitle}>One-Time Setup</Text>
                <Text style={styles.infoBannerText}>
                  Record your warehouse's initial inventory. This is a one-time action that activates your warehouse.
                </Text>
              </View>
            </View>

            {/* Add Crop Section */}
            <View style={styles.addSection}>
              <Text style={styles.sectionTitle}>Add Initial Inventory</Text>

              {/* Crop Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Crop Type</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.cropSelector}
                >
                  {CROP_OPTIONS.map((crop) => (
                    <TouchableOpacity
                      key={crop.value}
                      style={[
                        styles.cropOption,
                        selectedCrop === crop.value && styles.cropOptionSelected,
                      ]}
                      onPress={() => setSelectedCrop(crop.value)}
                    >
                      <Text
                        style={[
                          styles.cropOptionText,
                          selectedCrop === crop.value && styles.cropOptionTextSelected,
                        ]}
                      >
                        {crop.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Bags Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Number of Bags</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>📦</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter number of bags"
                    placeholderTextColor="#a8a29e"
                    keyboardType="number-pad"
                    value={bags}
                    onChangeText={setBags}
                  />
                </View>
              </View>

              {/* Add Button */}
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddCrop}
                disabled={!bags || parseInt(bags) <= 0}
              >
                <Text style={styles.addButtonText}>Add to Inventory</Text>
              </TouchableOpacity>
            </View>

            {/* Inventory List */}
            {inventory.length > 0 && (
              <View style={styles.inventorySection}>
                <Text style={styles.sectionTitle}>Initial Inventory ({inventory.length} types)</Text>
                {inventory.map((item) => (
                  <View key={item.cropType} style={styles.inventoryCard}>
                    <View style={styles.inventoryInfo}>
                      <Text style={styles.inventoryCrop}>{getCropLabel(item.cropType)}</Text>
                      <Text style={styles.inventoryBags}>{item.bags} bags</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveCrop(item.cropType)}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Total */}
                <View style={styles.totalCard}>
                  <Text style={styles.totalLabel}>Total Bags</Text>
                  <Text style={styles.totalValue}>{totalBags}</Text>
                </View>
              </View>
            )}

            {/* Warning Notice */}
            <View style={styles.warningBox}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Important</Text>
                <Text style={styles.warningText}>
                  Genesis confirmation is permanent and cannot be changed. Make sure all quantities are correct.
                </Text>
              </View>
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (inventory.length === 0 || isSubmitting) && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirmGenesis}
              disabled={inventory.length === 0 || isSubmitting}
            >
              <Text style={styles.confirmButtonText}>
                {isSubmitting ? 'Confirming...' : 'Confirm Genesis Inventory'}
              </Text>
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
  content: {
    padding: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  infoBannerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  addSection: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#44403c',
    marginBottom: 8,
  },
  cropSelector: {
    flexDirection: 'row',
  },
  cropOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f4',
    borderRadius: 12,
    marginRight: 8,
  },
  cropOptionSelected: {
    backgroundColor: '#3d9448',
  },
  cropOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#57534e',
  },
  cropOptionTextSelected: {
    color: '#ffffff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f4',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1c1917',
  },
  addButton: {
    backgroundColor: '#3d9448',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  inventorySection: {
    marginBottom: 24,
  },
  inventoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  inventoryInfo: {
    flex: 1,
  },
  inventoryCrop: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 4,
  },
  inventoryBags: {
    fontSize: 14,
    color: '#78716c',
  },
  removeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dc2626',
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3d9448',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#b45309',
    lineHeight: 18,
  },
  confirmButton: {
    backgroundColor: '#3d9448',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  confirmButtonDisabled: {
    backgroundColor: '#d6d3d1',
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
});
