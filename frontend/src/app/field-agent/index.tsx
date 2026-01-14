import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';

export default function FieldAgentHomeScreen() {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const [farmersCount, setFarmersCount] = useState(0);
  const [expectedBags, setExpectedBags] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      
      // Fetch farmers list
      const farmersRes = await fetch(`${API_ENDPOINTS.FIELD_AGENT_FARMERS}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const farmersData = await farmersRes.json();
      setFarmersCount(farmersData.data?.length || 0);

      // Fetch expected inventory
      const inventoryRes = await fetch(`${API_ENDPOINTS.FIELD_AGENT_EXPECTED_INVENTORY}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const inventoryData = await inventoryRes.json();
      const total = inventoryData.data?.reduce((sum: number, item: any) => sum + item.expected_bags, 0) || 0;
      setExpectedBags(total);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fafafa" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.name || 'Field Agent'}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/field-agent/profile')}
          style={styles.profileBtn}
        >
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.cardContainer}>
          {/* Farmers Card */}
          <TouchableOpacity 
            style={[styles.card, styles.farmersCard]}
            onPress={() => router.push('/field-agent/farmers')}
          >
            <Text style={styles.cardIcon}>👨‍🌾</Text>
            <Text style={styles.cardValue}>{farmersCount}</Text>
            <Text style={styles.cardLabel}>Farmers</Text>
            <Text style={styles.cardHint}>Tap to manage</Text>
          </TouchableOpacity>

          {/* Expected Bags Card */}
          <TouchableOpacity 
            style={[styles.card, styles.bagsCard]}
            onPress={() => router.push('/field-agent/expected-inventory')}
          >
            <Text style={styles.cardIcon}>📦</Text>
            <Text style={styles.cardValue}>{expectedBags}</Text>
            <Text style={styles.cardLabel}>Expected Bags</Text>
            <Text style={styles.cardHint}>In pipeline</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/field-agent/farmers')}
          >
            <Text style={styles.actionIcon}>➕</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Add New Farmer</Text>
              <Text style={styles.actionDesc}>Register a new outgrower</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/field-agent/service-entry')}
          >
            <Text style={styles.actionIcon}>📝</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Record Services</Text>
              <Text style={styles.actionDesc}>Log services provided</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/field-agent/update-recovery-date')}
          >
            <Text style={styles.actionIcon}>📅</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Update Expected Date</Text>
              <Text style={styles.actionDesc}>Adjust recovery timeline</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/field-agent/inbound')}
          >
            <Text style={styles.actionIcon}>📥</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Record Inbound</Text>
              <Text style={styles.actionDesc}>Recovery or aggregated</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            1. Register farmers{'\n'}
            2. Record services{'\n'}
            3. Update expected dates if delayed{'\n'}
            4. Record inbound (recovery/aggregated)
          </Text>
        </View>

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
  greeting: {
    fontSize: 14,
    color: '#999',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e1e1e',
    marginTop: 2,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  cardContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  farmersCard: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#81c784',
  },
  bagsCard: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#64b5f6',
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  cardLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  cardHint: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e1e1e',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e1e1e',
  },
  actionDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 18,
    color: '#bbb',
  },
  infoBox: {
    backgroundColor: '#f5f5f5',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
    borderRadius: 8,
    padding: 12,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e1e1e',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});
