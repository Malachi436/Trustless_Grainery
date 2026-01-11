import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';

export default function UpdateRecoveryDateScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [farmers, setFarmers] = useState<any[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [farmerModalVisible, setFarmerModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');

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
      const withDates = data.data?.serviceRecords?.filter(
        (s: any) => s.expected_recovery_date && s.recovery_status !== 'COMPLETED'
      ) || [];
      setServices(withDates);
    } catch (error) {
      console.error('Fetch services error:', error);
    }
  };

  const selectFarmer = (farmer: any) => {
    setSelectedFarmer(farmer);
    setFarmerModalVisible(false);
    fetchFarmerServices(farmer.id);
  };

  const openUpdateModal = (service: any) => {
    setSelectedService(service);
    // Pre-fill with current date + 7 days as suggestion
    const suggestedDate = new Date();
    suggestedDate.setDate(suggestedDate.getDate() + 7);
    setNewDate(suggestedDate.toISOString().split('T')[0]);
    setReason('');
    setUpdateModalVisible(true);
  };

  const submitDateUpdate = async () => {
    if (!newDate || !reason || reason.trim().length < 5) {
      Alert.alert('Invalid Input', 'Please provide a new date and a reason (min 5 characters)');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(
        `${API_ENDPOINTS.FIELD_AGENT_FARMERS}/${selectedFarmer.id}/services/${selectedService.id}/update-date`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            newDate,
            reason,
          }),
        }
      );

      if (res.ok) {
        Alert.alert('Success', 'Expected recovery date updated!');
        setUpdateModalVisible(false);
        fetchFarmerServices(selectedFarmer.id);
      } else {
        const error = await res.json();
        Alert.alert('Error', error.error || 'Failed to update date');
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Network error occurred');
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
        <Text style={styles.title}>Update Expected Date</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>📅</Text>
          <Text style={styles.infoText}>
            Update expected recovery dates when harvest is delayed. A reason must be provided for transparency.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Farmer</Text>
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

        {selectedFarmer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services with Expected Dates</Text>
            {services.length === 0 ? (
              <View style={styles.emptyServices}>
                <Text style={styles.emptyText}>No pending services with expected dates</Text>
              </View>
            ) : (
              services.map((service: any) => (
                <View key={service.id} style={styles.serviceCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Service Record</Text>
                    <Text style={[styles.status, styles.statusPending]}>
                      {service.recovery_status}
                    </Text>
                  </View>
                  <Text style={styles.cardDetail}>
                    Expected: {service.expected_bags} bags
                  </Text>
                  <Text style={styles.cardDetail}>
                    Current Expected Date: {new Date(service.expected_recovery_date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.cardDetail}>
                    Recorded: {new Date(service.created_at).toLocaleDateString()}
                  </Text>
                  <TouchableOpacity
                    style={[styles.updateBtn]}
                    onPress={() => openUpdateModal(service)}
                  >
                    <Text style={styles.updateBtnText}>📅 Update Date</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Farmer Selection Modal */}
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
                <Text style={styles.farmerOptionPhone}>{item.phone || 'No phone'}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
        </SafeAreaView>
      </Modal>

      {/* Date Update Modal */}
      <Modal
        visible={updateModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setUpdateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.updateModal}>
            <Text style={styles.updateModalTitle}>Update Expected Recovery Date</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Current Date:</Text>
              <Text style={styles.currentDate}>
                {selectedService?.expected_recovery_date 
                  ? new Date(selectedService.expected_recovery_date).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>New Expected Date:</Text>
              <TextInput
                style={styles.input}
                value={newDate}
                onChangeText={setNewDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Reason for Change: *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={reason}
                onChangeText={setReason}
                placeholder="e.g., Delayed due to weather conditions (min 5 characters)"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => setUpdateModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={submitDateUpdate}
                disabled={submitting}
              >
                <Text style={styles.submitBtnText}>
                  {submitting ? 'Updating...' : 'Update Date'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  infoCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e1e1e',
    marginBottom: 10,
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
  emptyServices: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 13,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e1e1e',
  },
  status: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  cardDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  updateBtn: {
    backgroundColor: '#2196f3',
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateBtnText: {
    color: '#fff',
    fontSize: 13,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  updateModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  updateModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e1e1e',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  currentDate: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 6,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e1e1e',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelBtn: {
    backgroundColor: '#f5f5f5',
  },
  cancelBtnText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#4caf50',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
