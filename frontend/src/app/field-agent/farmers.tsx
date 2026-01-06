import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';

export default function FarmersScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', community: '' });
  const [submitting, setSubmitting] = useState(false);

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

  const createFarmer = async () => {
    if (!formData.name.trim()) return;
    
    try {
      setSubmitting(true);
      const res = await fetch(API_ENDPOINTS.FIELD_AGENT_FARMERS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        const newFarmer = await res.json();
        setFarmers([...farmers, newFarmer.data]);
        setFormData({ name: '', phone: '', community: '' });
        setModalVisible(false);
      }
    } catch (error) {
      console.error('Create farmer error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderFarmerCard = ({ item }: any) => (
    <TouchableOpacity
      style={styles.farmerCard}
      onPress={() => router.push({
        pathname: '/field-agent/farmer-detail',
        params: { farmerId: item.id, name: item.name },
      })}
    >
      <View style={styles.farmerHeader}>
        <Text style={styles.farmerName}>{item.name}</Text>
        <Text style={styles.recordCount}>{item.service_records_count || 0}</Text>
      </View>
      <Text style={styles.farmerPhone}>{item.phone || 'No phone'}</Text>
      {item.community && <Text style={styles.farmerCommunity}>📍 {item.community}</Text>}
      <Text style={styles.farmerStatus}>{item.status}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Farmers</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#4caf50" />
        </View>
      ) : farmers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👨‍🌾</Text>
          <Text style={styles.emptyTitle}>No farmers yet</Text>
          <Text style={styles.emptyDesc}>Add your first farmer to get started</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.primaryBtnText}>Add Farmer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={farmers}
          renderItem={renderFarmerCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}

      {/* Add Farmer Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add New Farmer</Text>
            <View style={{ width: 30 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Farmer Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter farmer name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              editable={!submitting}
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional phone number"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              editable={!submitting}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Community</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional community"
              value={formData.community}
              onChangeText={(text) => setFormData({ ...formData, community: text })}
              editable={!submitting}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={createFarmer}
              disabled={submitting || !formData.name.trim()}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Create Farmer</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
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
  addBtn: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  farmerCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  farmerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  farmerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e1e1e',
  },
  recordCount: {
    fontSize: 12,
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  farmerPhone: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  farmerCommunity: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  farmerStatus: {
    fontSize: 11,
    color: '#81c784',
    fontWeight: '500',
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e1e1e',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e1e1e',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
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
});
