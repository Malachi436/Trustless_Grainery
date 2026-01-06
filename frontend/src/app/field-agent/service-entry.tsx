import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';

const SERVICE_TYPES = [
  'LAND_CLEARING',
  'PLOWING',
  'PLANTING',
  'WEEDING',
  'FERTILIZING',
  'PEST_CONTROL',
  'HARVESTING',
  'THRESHING',
  'DRYING',
  'OTHER',
];

export default function ServiceEntryScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [expectedBags, setExpectedBags] = useState('');
  const [landSize, setLandSize] = useState('');
  const [fertilizerType, setFertilizerType] = useState('');
  const [fertilizerQty, setFertilizerQty] = useState('');
  const [pesticideType, setPesticideType] = useState('');
  const [pesticideQty, setPesticideQty] = useState('');
  const [notes, setNotes] = useState('');
  
  const [farmerModalVisible, setFarmerModalVisible] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);

  useEffect(() => {
    fetchFarmers();
  }, []);

  const fetchFarmers = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.FIELD_AGENT_FARMERS, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setFarmers(data.data || []);
    } catch (error) {
      console.error('Fetch farmers error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  const submitService = async () => {
    if (!selectedFarmer || selectedServices.length === 0 || !expectedBags) {
      alert('Please fill required fields');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(
        API_ENDPOINTS.FIELD_AGENT_RECORD_SERVICE(selectedFarmer.id),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            serviceTypes: selectedServices,
            expectedBags: parseInt(expectedBags),
            landSizeAcres: landSize ? parseFloat(landSize) : undefined,
            fertilizerType: fertilizerType || undefined,
            fertilizerQuantityKg: fertilizerQty ? parseFloat(fertilizerQty) : undefined,
            pesticideType: pesticideType || undefined,
            pesticideQuantityLiters: pesticideQty ? parseFloat(pesticideQty) : undefined,
            notes: notes || undefined,
          }),
        }
      );

      if (res.ok) {
        alert('Service recorded successfully!');
        router.back();
      } else {
        alert('Failed to record service');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Error recording service');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#4caf50" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Record Services</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Farmer Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Farmer *</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => setFarmerModalVisible(true)}
          >
            <Text style={styles.selectBtnText}>
              {selectedFarmer ? selectedFarmer.name : 'Choose farmer...'}
            </Text>
            <Text style={styles.selectBtnArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Services Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services Provided *</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => setServiceModalVisible(true)}
          >
            <Text style={styles.selectBtnText}>
              {selectedServices.length === 0
                ? 'Select services...'
                : `${selectedServices.length} selected`}
            </Text>
            <Text style={styles.selectBtnArrow}>›</Text>
          </TouchableOpacity>
          {selectedServices.length > 0 && (
            <View style={styles.selectedServices}>
              {selectedServices.map((s) => (
                <View key={s} style={styles.serviceBadge}>
                  <Text style={styles.serviceBadgeText}>{s}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Expected Bags */}
        <View style={styles.section}>
          <Text style={styles.label}>Expected Bags *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter number of bags"
            keyboardType="number-pad"
            value={expectedBags}
            onChangeText={setExpectedBags}
            editable={!submitting}
          />
        </View>

        {/* Land Details */}
        <View style={styles.section}>
          <Text style={styles.label}>Land Size (Acres)</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            keyboardType="decimal-pad"
            value={landSize}
            onChangeText={setLandSize}
            editable={!submitting}
          />
        </View>

        {/* Fertilizer */}
        <View style={styles.section}>
          <Text style={styles.label}>Fertilizer Type</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g., NPK, Urea"
            value={fertilizerType}
            onChangeText={setFertilizerType}
            editable={!submitting}
          />
          <Text style={styles.label}>Quantity (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            keyboardType="decimal-pad"
            value={fertilizerQty}
            onChangeText={setFertilizerQty}
            editable={!submitting}
          />
        </View>

        {/* Pesticide */}
        <View style={styles.section}>
          <Text style={styles.label}>Pesticide Type</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g., Pyrethroids"
            value={pesticideType}
            onChangeText={setPesticideType}
            editable={!submitting}
          />
          <Text style={styles.label}>Quantity (Liters)</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            keyboardType="decimal-pad"
            value={pesticideQty}
            onChangeText={setPesticideQty}
            editable={!submitting}
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional notes"
            value={notes}
            onChangeText={setNotes}
            editable={!submitting}
            multiline
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={submitService}
          disabled={submitting || !selectedFarmer || selectedServices.length === 0 || !expectedBags}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Record Service</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Farmer Modal */}
      <Modal
        visible={farmerModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFarmerModalVisible(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setFarmerModalVisible(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Farmer</Text>
            <View style={{ width: 30 }} />
          </View>
          <FlatList
            data={farmers}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.farmerOption}
                onPress={() => {
                  setSelectedFarmer(item);
                  setFarmerModalVisible(false);
                }}
              >
                <Text style={styles.farmerOptionName}>{item.name}</Text>
                <Text style={styles.farmerOptionPhone}>{item.phone || 'No phone'}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
        </SafeAreaView>
      </Modal>

      {/* Service Modal */}
      <Modal
        visible={serviceModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setServiceModalVisible(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setServiceModalVisible(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Services</Text>
            <View style={{ width: 30 }} />
          </View>
          <FlatList
            data={SERVICE_TYPES}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.serviceOption,
                  selectedServices.includes(item) && styles.serviceOptionSelected,
                ]}
                onPress={() => toggleService(item)}
              >
                <Text style={styles.serviceOptionText}>
                  {selectedServices.includes(item) ? '✓ ' : ''}
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item}
          />
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => setServiceModalVisible(false)}
          >
            <Text style={styles.confirmBtnText}>Confirm</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    fontSize: 16,
    color: '#4caf50',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e1e1e',
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e1e1e',
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e1e1e',
    marginBottom: 6,
  },
  selectBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectBtnText: {
    fontSize: 14,
    color: '#1e1e1e',
  },
  selectBtnArrow: {
    fontSize: 18,
    color: '#bbb',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectedServices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  serviceBadge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  serviceBadgeText: {
    fontSize: 11,
    color: '#2e7d32',
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#4caf50',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeBtn: {
    fontSize: 24,
    color: '#999',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e1e1e',
  },
  farmerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  farmerOptionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e1e1e',
  },
  farmerOptionPhone: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },
  serviceOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  serviceOptionSelected: {
    backgroundColor: '#e8f5e9',
  },
  serviceOptionText: {
    fontSize: 14,
    color: '#1e1e1e',
  },
  confirmBtn: {
    backgroundColor: '#4caf50',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
