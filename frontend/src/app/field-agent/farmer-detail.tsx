import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';

export default function FarmerDetailScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const { farmerId } = useLocalSearchParams();
  
  const [farmer, setFarmer] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [recovery, setRecovery] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchFarmerDetails();
  }, []);

  const fetchFarmerDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_ENDPOINTS.FIELD_AGENT_FARMERS}/${farmerId}/services`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setServices(data.data?.serviceRecords || []);
      setRecovery(data.data?.recoveryStatus || []);
      
      // Extract farmer info from first service or from params
      if (data.data?.serviceRecords?.[0]) {
        setFarmer({
          id: farmerId,
          name: data.data.serviceRecords[0].farmer_name || 'Farmer',
        });
      }
    } catch (error) {
      console.error('Fetch farmer details error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFarmerDetails();
    setRefreshing(false);
  };

  const renderServiceRecord = (service: any, index: number) => (
    <View key={service.id || index} style={styles.serviceCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Service Record</Text>
        <Text style={[styles.status, getStatusStyle(service.recovery_status)]}>
          {service.recovery_status}
        </Text>
      </View>

      <View style={styles.serviceDetail}>
        <Text style={styles.label}>Services:</Text>
        <Text style={styles.value}>
          {Array.isArray(service.service_types)
            ? service.service_types.join(', ')
            : service.service_types || 'N/A'}
        </Text>
      </View>

      <View style={styles.serviceDetail}>
        <Text style={styles.label}>Expected Bags:</Text>
        <Text style={styles.value}>{service.expected_bags} bags</Text>
      </View>

      {service.land_size_acres && (
        <View style={styles.serviceDetail}>
          <Text style={styles.label}>Land Size:</Text>
          <Text style={styles.value}>{service.land_size_acres} acres</Text>
        </View>
      )}

      {service.fertilizer_type && (
        <View style={styles.serviceDetail}>
          <Text style={styles.label}>Fertilizer:</Text>
          <Text style={styles.value}>
            {service.fertilizer_type} ({service.fertilizer_quantity_kg || '?'} kg)
          </Text>
        </View>
      )}

      {service.pesticide_type && (
        <View style={styles.serviceDetail}>
          <Text style={styles.label}>Pesticide:</Text>
          <Text style={styles.value}>
            {service.pesticide_type} ({service.pesticide_quantity_liters || '?'} L)
          </Text>
        </View>
      )}

      <View style={styles.serviceDetail}>
        <Text style={styles.label}>Service Date:</Text>
        <Text style={styles.value}>
          {new Date(service.created_at).toLocaleDateString()}
        </Text>
      </View>

      {service.harvest_completed_at && (
        <View style={styles.serviceDetail}>
          <Text style={styles.label}>Harvest Date:</Text>
          <Text style={styles.value}>
            {new Date(service.harvest_completed_at).toLocaleDateString()}
          </Text>
        </View>
      )}
    </View>
  );

  const renderRecoveryStatus = (rec: any, index: number) => (
    <View key={rec.service_record_id || index} style={styles.recoveryCard}>
      <View style={styles.recoveryHeader}>
        <Text style={styles.recoveryTitle}>Recovery Progress</Text>
        <Text style={[styles.recoveryStatus, getRecoveryStyle(rec.recovery_status)]}>
          {rec.recovery_status}
        </Text>
      </View>

      <View style={styles.recoveryStats}>
        <View style={styles.recoveryStatItem}>
          <Text style={styles.recoveryStatLabel}>Expected</Text>
          <Text style={styles.recoveryStatValue}>{rec.expected_bags}</Text>
        </View>
        <View style={styles.recoveryStatItem}>
          <Text style={styles.recoveryStatLabel}>Received</Text>
          <Text style={[styles.recoveryStatValue, styles.recoveryStatValueGreen]}>
            {rec.received_bags || 0}
          </Text>
        </View>
        <View style={styles.recoveryStatItem}>
          <Text style={styles.recoveryStatLabel}>Outstanding</Text>
          <Text style={[styles.recoveryStatValue, styles.recoveryStatValueRed]}>
            {Math.max(0, (rec.expected_bags || 0) - (rec.received_bags || 0))}
          </Text>
        </View>
      </View>

      <View style={styles.recoveryProgress}>
        <View
          style={[
            styles.recoveryProgressFill,
            {
              width: `${Math.min(((rec.received_bags || 0) / (rec.expected_bags || 1)) * 100, 100)}%`,
            },
          ]}
        />
      </View>

      {rec.completed_at && (
        <Text style={styles.recoveryDate}>
          Completed: {new Date(rec.completed_at).toLocaleDateString()}
        </Text>
      )}
    </View>
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return styles.statusCompleted;
      case 'PARTIAL':
        return styles.statusPartial;
      case 'HARVESTED':
        return styles.statusHarvested;
      default:
        return styles.statusPending;
    }
  };

  const getRecoveryStyle = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return styles.recoveryStatusCompleted;
      case 'PARTIAL':
        return styles.recoveryStatusPartial;
      case 'HARVESTED':
        return styles.recoveryStatusHarvested;
      default:
        return styles.recoveryStatusPending;
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
        <Text style={styles.title}>{farmer?.name || 'Farmer'}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Farmer Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatBox}>
              <Text style={styles.summaryStatValue}>{services.length}</Text>
              <Text style={styles.summaryStatLabel}>Services</Text>
            </View>
            <View style={styles.summaryStatBox}>
              <Text style={styles.summaryStatValue}>
                {recovery.filter((r) => r.recovery_status === 'COMPLETED').length}
              </Text>
              <Text style={styles.summaryStatLabel}>Completed</Text>
            </View>
            <View style={styles.summaryStatBox}>
              <Text style={styles.summaryStatValue}>
                {recovery.reduce((sum, r) => sum + (r.expected_bags || 0), 0)}
              </Text>
              <Text style={styles.summaryStatLabel}>Expected</Text>
            </View>
            <View style={styles.summaryStatBox}>
              <Text style={[styles.summaryStatValue, styles.receivedText]}>
                {recovery.reduce((sum, r) => sum + (r.received_bags || 0), 0)}
              </Text>
              <Text style={styles.summaryStatLabel}>Received</Text>
            </View>
          </View>
        </View>

        {/* Services Section */}
        {services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Records ({services.length})</Text>
            {services.map((service, index) => renderServiceRecord(service, index))}
          </View>
        )}

        {/* Recovery Section */}
        {recovery.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recovery Progress ({recovery.length})</Text>
            {recovery.map((rec, index) => renderRecoveryStatus(rec, index))}
          </View>
        )}

        {/* Empty State */}
        {services.length === 0 && recovery.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptyDesc}>Services will appear here once recorded</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    flex: 1,
    textAlign: 'center',
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
  summarySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e1e1e',
    marginBottom: 10,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryStatBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  receivedText: {
    color: '#2e7d32',
  },
  summaryStatLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e1e1e',
  },
  status: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusCompleted: {
    backgroundColor: '#c8e6c9',
    color: '#1b5e20',
  },
  statusPartial: {
    backgroundColor: '#fff9c4',
    color: '#f57f17',
  },
  statusHarvested: {
    backgroundColor: '#ffccbc',
    color: '#bf360c',
  },
  statusPending: {
    backgroundColor: '#e0e0e0',
    color: '#424242',
  },
  serviceDetail: {
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  value: {
    fontSize: 12,
    color: '#1e1e1e',
    fontWeight: '500',
  },
  recoveryCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#81c784',
  },
  recoveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recoveryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1b5e20',
  },
  recoveryStatus: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  recoveryStatusCompleted: {
    backgroundColor: '#c8e6c9',
    color: '#1b5e20',
  },
  recoveryStatusPartial: {
    backgroundColor: '#fff9c4',
    color: '#f57f17',
  },
  recoveryStatusHarvested: {
    backgroundColor: '#ffccbc',
    color: '#bf360c',
  },
  recoveryStatusPending: {
    backgroundColor: '#f8f9fa',
    color: '#424242',
  },
  recoveryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#81c784',
  },
  recoveryStatItem: {
    alignItems: 'center',
  },
  recoveryStatLabel: {
    fontSize: 9,
    color: '#1b5e20',
    marginBottom: 2,
  },
  recoveryStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1b5e20',
  },
  recoveryStatValueGreen: {
    color: '#1b5e20',
  },
  recoveryStatValueRed: {
    color: '#d32f2f',
  },
  recoveryProgress: {
    height: 4,
    backgroundColor: '#c8e6c9',
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  recoveryProgressFill: {
    height: '100%',
    backgroundColor: '#1b5e20',
  },
  recoveryDate: {
    fontSize: 10,
    color: '#1b5e20',
    fontStyle: 'italic',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e1e1e',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#999',
  },
});
