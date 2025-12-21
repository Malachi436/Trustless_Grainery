import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { CropType } from '@/lib/types';
import { API_ENDPOINTS } from '@/lib/api-config';

type GenesisItem = {
  crop: CropType;
  quantity: number;
};

export default function GenesisConfirmationScreen() {
  const router = useRouter();
  const { user, warehouse, accessToken } = useAuthStore();
  const [genesisInventory, setGenesisInventory] = useState<GenesisItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchGenesisInventory();
  }, []);

  const fetchGenesisInventory = async () => {
    try {
      // Fetch the dashboard which includes stock/genesis info
      const response = await fetch(API_ENDPOINTS.OWNER_DASHBOARD, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      
      if (data.success && data.data.stock) {
        // Convert stock to genesis inventory format
        const inventory = data.data.stock.map((item: any) => ({
          crop: item.crop, // Backend returns 'crop', not 'cropType'
          quantity: item.bag_count, // Backend returns 'bag_count', not 'bagCount'
        }));
        setGenesisInventory(inventory);
      }
    } catch (error) {
      console.error('Failed to fetch genesis inventory:', error);
      Alert.alert('Error', 'Failed to load genesis inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const totalBags = genesisInventory.reduce((sum, item) => sum + item.quantity, 0);

  const getCropLabel = (cropType: CropType): string => {
    // Add null/undefined check
    if (!cropType) return 'Unknown';
    return cropType.charAt(0).toUpperCase() + cropType.slice(1);
  };

  const handleConfirmGenesis = async () => {
    if (genesisInventory.length === 0) {
      Alert.alert('No Genesis Inventory', 'There is no genesis inventory to confirm. Please contact the administrator.');
      return;
    }

    const inventoryList = genesisInventory
      .map(item => `${getCropLabel(item.crop)}: ${item.quantity} bags`)
      .join('\n');
    
    Alert.alert(
      'Confirm Genesis Inventory',
      'You are about to confirm the initial inventory recorded by the administrator:\n\n' + inventoryList + '\n\nTotal: ' + totalBags + ' bags\n\nThis will activate your warehouse. Continue?',
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
      const response = await fetch(API_ENDPOINTS.OWNER_GENESIS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}), // No body needed - just confirming
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Genesis Confirmed!',
          'Initial inventory has been confirmed. Your warehouse is now active.',
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8fcd84" />
          <Text style={styles.loadingText}>Loading genesis inventory...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
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
              <Text style={styles.infoBannerTitle}>Warehouse Activation</Text>
              <Text style={styles.infoBannerText}>
                Review and confirm the initial inventory recorded by the administrator. This will activate your warehouse.
              </Text>
            </View>
          </View>

          {genesisInventory.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📦</Text>
              <Text style={styles.emptyStateTitle}>No Genesis Inventory</Text>
              <Text style={styles.emptyStateText}>
                The administrator has not yet recorded the genesis inventory for your warehouse. Please contact them to proceed.
              </Text>
            </View>
          ) : (
            <View style={styles.inventorySection}>
              <Text style={styles.sectionTitle}>Initial Inventory</Text>
              
              {genesisInventory.map((item, index) => (
                <View key={index} style={styles.inventoryItem}>
                  <View style={styles.inventoryItemLeft}>
                    <View style={styles.cropIcon}>
                      <Text style={styles.cropIconText}>{getCropLabel(item.crop).charAt(0)}</Text>
                    </View>
                    <Text style={styles.cropName}>{getCropLabel(item.crop)}</Text>
                  </View>
                  <Text style={styles.cropBags}>{item.quantity} bags</Text>
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
                Genesis confirmation is permanent and will activate your warehouse. Make sure all quantities are correct.
              </Text>
            </View>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (genesisInventory.length === 0 || isSubmitting) && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirmGenesis}
            disabled={genesisInventory.length === 0 || isSubmitting}
          >
            <Text style={styles.confirmButtonText}>
              {isSubmitting ? 'Confirming...' : 'Confirm & Activate Warehouse'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b6f69',
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
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7e5',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#1e1e1e',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e1e1e',
  },
  content: {
    padding: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#f0f4ed',
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
    color: '#1e1e1e',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 14,
    color: '#6b6f69',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e1e1e',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b6f69',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  inventorySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e1e1e',
    marginBottom: 16,
  },
  inventoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7e5',
  },
  inventoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#8fcd84',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cropIconText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  cropName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e1e1e',
  },
  cropBags: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8fcd84',
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f4ed',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e1e1e',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8fcd84',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fff4e6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ffd699',
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
    color: '#d4a574',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#8a7660',
    lineHeight: 18,
  },
  confirmButton: {
    backgroundColor: '#8fcd84',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonDisabled: {
    backgroundColor: '#d9d9d5',
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
