import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';

export default function ExpectedInventoryScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    totalExpected: 0,
    totalReceived: 0,
    outstanding: 0,
    completedCount: 0,
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.FIELD_AGENT_EXPECTED_INVENTORY, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      const items = data.data || [];
      setInventory(items);
      
      // Calculate summary
      const totalExpected = items.reduce((sum: number, item: any) => sum + (item.expected_bags || 0), 0);
      const totalReceived = items.reduce((sum: number, item: any) => sum + (item.received_bags || 0), 0);
      const outstanding = totalExpected - totalReceived;
      const completed = items.filter((item: any) => item.recovery_status === 'COMPLETED').length;
      
      setSummary({
        totalExpected,
        totalReceived,
        outstanding,
        completedCount: completed,
      });
    } catch (error) {
      console.error('Fetch inventory error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInventory();
    setRefreshing(false);
  };

  const renderInventoryItem = ({ item }: any) => {
    const isCompleted = item.recovery_status === 'COMPLETED';
    const isPending = item.recovery_status === 'PENDING';
    const isPartial = item.recovery_status === 'PARTIAL';
    const isHarvested = item.recovery_status === 'HARVESTED';

    const outstanding = item.expected_bags - (item.received_bags || 0);

    return (
      <TouchableOpacity
        style={styles.inventoryCard}
        onPress={() => router.push({
          pathname: '/field-agent/farmer-detail',
          params: { farmerId: item.farmer_id },
        })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.farmerName}>{item.farmer_name}</Text>
          <Text style={[styles.status, getStatusStyle(item.recovery_status)]}>
            {item.recovery_status}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Expected</Text>
            <Text style={styles.statValue}>{item.expected_bags}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Received</Text>
            <Text style={[styles.statValue, styles.receivedValue]}>
              {item.received_bags || 0}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Outstanding</Text>
            <Text style={[styles.statValue, outstanding > 0 && styles.outstandingValue]}>
              {outstanding}
            </Text>
          </View>
        </View>

        {item.service_date && (
          <Text style={styles.cardDate}>
            Service: {new Date(item.service_date).toLocaleDateString()}
          </Text>
        )}

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min((item.received_bags / item.expected_bags) * 100, 100)}%` },
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.title}>Expected Inventory</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
            <Text style={styles.summaryLabel}>Total Expected</Text>
            <Text style={styles.summaryValue}>{summary.totalExpected}</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardSuccess]}>
            <Text style={styles.summaryLabel}>Total Received</Text>
            <Text style={styles.summaryValue}>{summary.totalReceived}</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardWarning]}>
            <Text style={styles.summaryLabel}>Outstanding</Text>
            <Text style={styles.summaryValue}>{summary.outstanding}</Text>
          </View>
        </View>

        <View style={styles.completionCard}>
          <Text style={styles.completionLabel}>Completed: {summary.completedCount} records</Text>
          <View style={styles.completionBar}>
            <View
              style={[
                styles.completionFill,
                {
                  width: `${Math.min((summary.completedCount / Math.max(inventory.length, 1)) * 100, 100)}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Inventory List */}
        {inventory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No expected inventory</Text>
            <Text style={styles.emptyDesc}>Services will appear here once recorded</Text>
          </View>
        ) : (
          <FlatList
            data={inventory}
            renderItem={renderInventoryItem}
            keyExtractor={(item) => item.service_record_id || item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
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
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCardPrimary: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#64b5f6',
  },
  summaryCardSuccess: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#81c784',
  },
  summaryCardWarning: {
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ffb74d',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  completionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  completionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e1e1e',
    marginBottom: 8,
  },
  completionBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  completionFill: {
    height: '100%',
    backgroundColor: '#4caf50',
  },
  listContent: {
    gap: 10,
  },
  inventoryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  farmerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e1e1e',
  },
  status: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  receivedValue: {
    color: '#2e7d32',
  },
  outstandingValue: {
    color: '#d32f2f',
  },
  cardDate: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
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
