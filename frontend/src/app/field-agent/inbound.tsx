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

const CROP_TYPES = ['MAIZE', 'RED MAIZE', 'WHITE MAIZE', 'RICE', 'BEANS', 'SORGHUM', 'MILLET', 'WHEAT', 'CASSAVA', 'GROUNDNUTS', 'SUNFLOWER', 'OTHER'];

export default function InboundScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [farmers, setFarmers] = useState<any[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null);
  const [recoveryServices, setRecoveryServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [inboundType, setInboundType] = useState(0); // 0=Recovery, 1=Aggregated
  const [selectedService, setSelectedService] = useState<any>(null);
  const [crop, setCrop] = useState('');
  const [bags, setBags] = useState('');
  const [notes, setNotes] = useState('');
  
  const [farmerModalVisible, setFarmerModalVisible] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [cropModalVisible, setCropModalVisible] = useState(false);

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

  const fetchFarmerServices = async (farmerId: string) => {
    try {
      const res = await fetch(
        `${API_ENDPOINTS.FIELD_AGENT_FARMERS}/${farmerId}/services`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );
      const data = await res.json();
      const harvestedServices = data.data?.serviceRecords?.filter(
        (s: any) => s.recovery_status === 'HARVESTED' || s.recovery_status === 'PARTIAL'
      ) || [];
      setRecoveryServices(harvestedServices);
    } catch (error) {
      console.error('Fetch services error:', error);
    }
  };

  const selectFarmer = (farmer: any) => {
    setSelectedFarmer(farmer);
    setFarmerModalVisible(false);
    fetchFarmerServices(farmer.id);
  };

  const submitInbound = async () => {
    if (!selectedFarmer || !crop || !bags) {
      alert('Please fill required fields');
      return;
    }

    if (inboundType === 0 && !selectedService) {
      alert('Please select a service record for recovery');
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = inboundType === 0
        ? API_ENDPOINTS.FIELD_AGENT_RECOVERY_INBOUND
        : API_ENDPOINTS.FIELD_AGENT_AGGREGATED_INBOUND;

      const body = inboundType === 0
        ? {
            serviceRecordId: selectedService.id,
            farmerId: selectedFarmer.id,
            crop,
            bagsReceived: parseInt(bags),
            notes: notes || undefined,
          }
        : {
            farmerId: selectedFarmer.id,
            crop,
            bags: parseInt(bags),
            notes: notes || undefined,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        alert(`${inboundType === 0 ? 'Recovery' : 'Aggregated'} inbound recorded!`);
        setCrop('');
        setBags('');
        setNotes('');
        setSelectedService(null);
        router.back();
      } else {
        alert('Failed to record inbound');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Error recording inbound');
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

  const inboundTypeLabel = inboundType === 0 ? 'Recovery' : 'Aggregated';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Record Inbound</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Inbound Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inbound Type</Text>
          {Platform.OS === 'ios' ? (
            <View style={styles.segmentedControlAndroid}>
              <TouchableOpacity
                style={[styles.segment, inboundType === 0 && styles.segmentActive]}
                onPress={() => setInboundType(0)}
              >
                <Text style={[styles.segmentText, inboundType === 0 && styles.segmentTextActive]}>
                  Recovery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, inboundType === 1 && styles.segmentActive]}
                onPress={() => setInboundType(1)}
              >
                <Text style={[styles.segmentText, inboundType === 1 && styles.segmentTextActive]}>
                  Aggregated
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.segmentedControlAndroid}>
              <TouchableOpacity
                style={[styles.segment, inboundType === 0 && styles.segmentActive]}
                onPress={() => setInboundType(0)}
              >
                <Text style={[styles.segmentText, inboundType === 0 && styles.segmentTextActive]}>
                  Recovery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, inboundType === 1 && styles.segmentActive]}
                onPress={() => setInboundType(1)}
              >
                <Text style={[styles.segmentText, inboundType === 1 && styles.segmentTextActive]}>
                  Aggregated
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.typeDesc}>
            {inboundType === 0
              ? 'Link to a service record for recovery tracking'
              : 'Independent farmer sale (no service link)'}
          </Text>
        </View>

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

        {/* Service Selection (Recovery only) */}
        {inboundType === 0 && selectedFarmer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Record *</Text>
            {recoveryServices.length === 0 ? (
              <View style={styles.emptyServices}>
                <Text style={styles.emptyText}>No harvested services</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.selectBtn}
                onPress={() => setServiceModalVisible(true)}
              >
                <Text style={styles.selectBtnText}>
                  {selectedService
                    ? `${selectedService.expected_bags} bags expected`
                    : 'Choose service...'}
                </Text>
                <Text style={styles.selectBtnArrow}>›</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Crop Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Crop Type *</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => setCropModalVisible(true)}
          >
            <Text style={styles.selectBtnText}>{crop || 'Select crop...'}</Text>
            <Text style={styles.selectBtnArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Bags */}
        <View style={styles.section}>
          <Text style={styles.label}>{inboundType === 0 ? 'Bags Received' : 'Bags'} *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter number of bags"
            keyboardType="number-pad"
            value={bags}
            onChangeText={setBags}
            editable={!submitting}
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Optional notes"
            value={notes}
            onChangeText={setNotes}
            editable={!submitting}
            multiline
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={submitInbound}
          disabled={submitting || !selectedFarmer || !crop || !bags}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Record {inboundTypeLabel} Inbound</Text>
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
                onPress={() => selectFarmer(item)}
              >
                <Text style={styles.farmerOptionName}>{item.name}</Text>
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
            <Text style={styles.modalTitle}>Select Service</Text>
            <View style={{ width: 30 }} />
          </View>
          <FlatList
            data={recoveryServices}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.serviceOption}
                onPress={() => {
                  setSelectedService(item);
                  setServiceModalVisible(false);
                }}
              >
                <Text style={styles.serviceOptionText}>
                  {item.expected_bags} bags • {item.recovery_status}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
        </SafeAreaView>
      </Modal>

      {/* Crop Modal */}
      <Modal
        visible={cropModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCropModalVisible(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCropModalVisible(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Crop</Text>
            <View style={{ width: 30 }} />
          </View>
          <FlatList
            data={CROP_TYPES}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.cropOption}
                onPress={() => {
                  setCrop(item);
                  setCropModalVisible(false);
                }}
              >
                <Text style={styles.cropOptionText}>{item}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item}
          />
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
  segmentedControl: {
    marginBottom: 10,
  },
  segmentedControlAndroid: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    marginBottom: 10,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: '#4caf50',
  },
  segmentText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#fff',
  },
  typeDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
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
  emptyServices: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 13,
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
  serviceOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  serviceOptionText: {
    fontSize: 14,
    color: '#1e1e1e',
  },
  cropOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  cropOptionText: {
    fontSize: 14,
    color: '#1e1e1e',
  },
});
