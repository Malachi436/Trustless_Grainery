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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';

export default function HarvestScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [farmers, setFarmers] = useState<any[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [farmerModalVisible, setFarmerModalVisible] = useState(false);

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
      const pending = data.data?.serviceRecords?.filter(
        (s: any) => s.recovery_status !== 'COMPLETED'
      ) || [];
      setServices(pending);
    } catch (error) {
      console.error('Fetch services error:', error);
    }
  };

  const selectFarmer = (farmer: any) => {
    setSelectedFarmer(farmer);
    setFarmerModalVisible(false);
    fetchFarmerServices(farmer.id);
  };

  const markHarvestComplete = async (serviceRecord: any) => {
    try {
      setSubmitting(true);
      const res = await fetch(
        API_ENDPOINTS.FIELD_AGENT_HARVEST_COMPLETE(selectedFarmer.id),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            serviceRecordId: serviceRecord.id,
          }),
        }
      );

      if (res.ok) {
        alert('Harvest marked as complete!');
        fetchFarmerServices(selectedFarmer.id);
      } else {
        alert('Failed to mark harvest complete');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Error marking harvest');
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
        <Text style={styles.title}>Mark Harvest Complete</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content}>
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
            <Text style={styles.sectionTitle}>Pending Services</Text>
            {services.length === 0 ? (
              <View style={styles.emptyServices}>
                <Text style={styles.emptyText}>No pending services</Text>
              </View>
            ) : (
              services.map((service: any) => (
                <TouchableOpacity
                  key={service.id}
                  style={styles.serviceCard}
                  onPress={() => markHarvestComplete(service)}
                >
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
                    Date: {new Date(service.created_at).toLocaleDateString()}
                  </Text>
                  <TouchableOpacity
                    style={[styles.completeBtn, submitting && styles.completeBtnDisabled]}
                    onPress={() => markHarvestComplete(service)}
                    disabled={submitting}
                  >
                    <Text style={styles.completeBtnText}>✓ Mark Complete</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

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
  completeBtn: {
    backgroundColor: '#4caf50',
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBtnDisabled: {
    opacity: 0.5,
  },
  completeBtnText: {
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
});
