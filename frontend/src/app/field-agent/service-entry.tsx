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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';
import DateTimePicker from '@react-native-community/datetimepicker';

const SERVICE_TYPES = [
  'LAND_CLEARING',
  'PLOWING',
  'HARROWING',
  'RIDGING',
  'PLANTING',
  'WEEDING',
  'FERTILIZING',
  'PEST_CONTROL',
  'HARVESTING',
  'THRESHING',
  'DRYING',
  'OTHER',
];

interface ServiceDetail {
  service_type: string;
  land_size_acres?: number;
  fertilizer_type?: string;
  fertilizer_quantity_kg?: number;
  pesticide_type?: string;
  pesticide_quantity_liters?: number;
  notes?: string;
}

export default function ServiceEntryScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceDetails, setServiceDetails] = useState<Record<string, ServiceDetail>>({});
  const [expectedBags, setExpectedBags] = useState('');
  const [expectedRecoveryDate, setExpectedRecoveryDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
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
    setSelectedServices((prev) => {
      if (prev.includes(service)) {
        // Remove service and its details
        const newDetails = { ...serviceDetails };
        delete newDetails[service];
        setServiceDetails(newDetails);
        return prev.filter((s) => s !== service);
      } else {
        // Add service and initialize its details
        setServiceDetails((prevDetails) => ({
          ...prevDetails,
          [service]: { service_type: service },
        }));
        return [...prev, service];
      }
    });
  };

  const updateServiceDetail = (service: string, field: string, value: any) => {
    setServiceDetails((prev) => ({
      ...prev,
      [service]: {
        ...prev[service],
        [field]: value,
      },
    }));
  };

  const getRequiredFields = (service: string): string[] => {
    const landBased = ['LAND_CLEARING', 'PLOWING', 'HARROWING', 'RIDGING', 'PLANTING', 'WEEDING', 'HARVESTING', 'THRESHING', 'DRYING'];
    
    if (landBased.includes(service)) return ['land_size_acres'];
    if (service === 'FERTILIZING') return ['fertilizer_type', 'fertilizer_quantity_kg'];
    if (service === 'PEST_CONTROL') return ['pesticide_type', 'pesticide_quantity_liters'];
    if (service === 'OTHER') return ['notes'];
    return [];
  };

  const submitService = async () => {
    // Validation
    if (!selectedFarmer || selectedServices.length === 0 || !expectedBags) {
      alert('Please select farmer, at least one service, and enter expected bags');
      return;
    }

    // Validate each service has required fields
    for (const service of selectedServices) {
      const requiredFields = getRequiredFields(service);
      const detail = serviceDetails[service];
      
      for (const field of requiredFields) {
        if (!detail || !detail[field as keyof ServiceDetail] || detail[field as keyof ServiceDetail] === '') {
          alert(`${service}: ${field.replace(/_/g, ' ')} is required`);
          return;
        }
        
        // Validate positive numbers
        if (field.includes('quantity') || field.includes('size') || field.includes('acres')) {
          const val = detail[field as keyof ServiceDetail];
          if (typeof val === 'number' && val <= 0) {
            alert(`${service}: ${field.replace(/_/g, ' ')} must be positive`);
            return;
          }
        }
      }
    }

    // Build services array
    const services = selectedServices.map(service => serviceDetails[service]);

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
            services,
            expectedBags: parseInt(expectedBags),
            expectedRecoveryDate: expectedRecoveryDate ? expectedRecoveryDate.toISOString().split('T')[0] : undefined,
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

        {/* Expected Recovery Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Expected Harvest Date</Text>
          <TouchableOpacity
            style={styles.datePickerBtn}
            onPress={() => setShowDatePicker(true)}
            disabled={submitting}
          >
            <Text style={styles.datePickerText}>
              {expectedRecoveryDate ? expectedRecoveryDate.toLocaleDateString() : 'Select date (optional)'}
            </Text>
            <Text style={styles.datePickerIcon}>📅</Text>
          </TouchableOpacity>
          {expectedRecoveryDate && (
            <TouchableOpacity
              onPress={() => setExpectedRecoveryDate(undefined)}
              style={styles.clearDateBtn}
            >
              <Text style={styles.clearDateText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={expectedRecoveryDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setExpectedRecoveryDate(selectedDate);
              }
            }}
            minimumDate={new Date()}
          />
        )}

        {/* Service Detail Cards - One per selected service */}
        {selectedServices.map((service) => {
          const detail = serviceDetails[service] || {};
          const requiredFields = getRequiredFields(service);
          const landBased = ['LAND_CLEARING', 'PLOWING', 'HARROWING', 'RIDGING', 'PLANTING', 'WEEDING', 'HARVESTING', 'THRESHING', 'DRYING'];
          
          return (
            <View key={service} style={styles.serviceCard}>
              <Text style={styles.serviceCardTitle}>{service.replace(/_/g, ' ')}</Text>
              
              {landBased.includes(service) && (
                <View style={styles.cardSection}>
                  <Text style={styles.cardLabel}>Land Size (Acres) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter land size"
                    keyboardType="decimal-pad"
                    value={detail.land_size_acres?.toString() || ''}
                    onChangeText={(text) => updateServiceDetail(service, 'land_size_acres', parseFloat(text) || undefined)}
                    editable={!submitting}
                  />
                </View>
              )}
              
              {service === 'FERTILIZING' && (
                <>
                  <View style={styles.cardSection}>
                    <Text style={styles.cardLabel}>Fertilizer Type *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="E.g., NPK, Urea"
                      value={detail.fertilizer_type || ''}
                      onChangeText={(text) => updateServiceDetail(service, 'fertilizer_type', text)}
                      editable={!submitting}
                    />
                  </View>
                  <View style={styles.cardSection}>
                    <Text style={styles.cardLabel}>Quantity (kg) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter quantity"
                      keyboardType="decimal-pad"
                      value={detail.fertilizer_quantity_kg?.toString() || ''}
                      onChangeText={(text) => updateServiceDetail(service, 'fertilizer_quantity_kg', parseFloat(text) || undefined)}
                      editable={!submitting}
                    />
                  </View>
                </>
              )}
              
              {service === 'PEST_CONTROL' && (
                <>
                  <View style={styles.cardSection}>
                    <Text style={styles.cardLabel}>Pesticide Type *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="E.g., Pyrethroids"
                      value={detail.pesticide_type || ''}
                      onChangeText={(text) => updateServiceDetail(service, 'pesticide_type', text)}
                      editable={!submitting}
                    />
                  </View>
                  <View style={styles.cardSection}>
                    <Text style={styles.cardLabel}>Quantity (Liters) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter quantity"
                      keyboardType="decimal-pad"
                      value={detail.pesticide_quantity_liters?.toString() || ''}
                      onChangeText={(text) => updateServiceDetail(service, 'pesticide_quantity_liters', parseFloat(text) || undefined)}
                      editable={!submitting}
                    />
                  </View>
                </>
              )}
              
              {service === 'OTHER' && (
                <View style={styles.cardSection}>
                  <Text style={styles.cardLabel}>Description *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe the service"
                    value={detail.notes || ''}
                    onChangeText={(text) => updateServiceDetail(service, 'notes', text)}
                    editable={!submitting}
                    multiline
                  />
                </View>
              )}
            </View>
          );
        })}

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
  datePickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  datePickerText: {
    fontSize: 14,
    color: '#1e1e1e',
  },
  datePickerIcon: {
    fontSize: 20,
  },
  clearDateBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearDateText: {
    fontSize: 12,
    color: '#f44336',
    textDecorationLine: 'underline',
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
  serviceCard: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  serviceCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4caf50',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  cardSection: {
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e1e1e',
    marginBottom: 6,
  },
});
