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
import { API_ENDPOINTS } from '@/lib/api-config';

export default function AttendantHomeScreen() {
  const router = useRouter();
  const { user, logout, accessToken } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(API_ENDPOINTS.ATTENDANT_HOME, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f4" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>JO</Text>
            </View>
            <View>
              <Text style={styles.welcomeText}>Welcome,</Text>
              <Text style={styles.userName}>{user?.name || 'Attendant'}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Today's Activity</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats?.entriesLogged || 0}</Text>
              <Text style={styles.statLabel}>Entries Logged</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats?.dispatched || 0}</Text>
              <Text style={styles.statLabel}>Dispatched</Text>
            </View>
          </View>
        </View>

        {/* Main Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          {/* Log Inbound Stock */}
          <TouchableOpacity
            style={[styles.actionCard, styles.primaryAction]}
            onPress={() => router.push('/attendant/log-inbound')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, styles.primaryIconContainer]}>
              <Text style={[styles.actionIconText, styles.primaryIconText]}>+</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, styles.primaryTitle]}>Log Inbound Stock</Text>
              <Text style={[styles.actionSubtitle, styles.primarySubtitle]}>Record new stock arriving at warehouse</Text>
            </View>
            <Text style={[styles.chevron, styles.primaryChevron]}>›</Text>
          </TouchableOpacity>

          {/* Request Dispatch */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/attendant/request-dispatch')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIconText}>→</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Request Dispatch</Text>
              <Text style={styles.actionSubtitle}>Create sale request for owner approval</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          {/* Recent Entry 1 */}
          <View style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <View style={styles.activityLeft}>
                <View style={styles.activityIconContainer}>
                  <Text style={styles.activityIcon}>↓</Text>
                </View>
                <View>
                  <Text style={styles.activityCrop}>Maize</Text>
                  <Text style={styles.activityType}>Inbound</Text>
                </View>
              </View>
              <View style={styles.activityRight}>
                <Text style={styles.activityQuantity}>+50</Text>
                <Text style={styles.activityBags}>bags</Text>
              </View>
            </View>
            <Text style={styles.activityTime}>2 hours ago</Text>
          </View>

          {/* Recent Entry 2 */}
          <View style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <View style={styles.activityLeft}>
                <View style={styles.activityIconContainer}>
                  <Text style={styles.activityIcon}>↑</Text>
                </View>
                <View>
                  <Text style={styles.activityCrop}>Rice</Text>
                  <Text style={styles.activityType}>Outbound</Text>
                </View>
              </View>
              <View style={styles.activityRight}>
                <Text style={styles.activityQuantity}>-20</Text>
                <Text style={styles.activityBags}>bags</Text>
              </View>
            </View>
            <Text style={styles.activityTime}>5 hours ago</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f4',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#3d9448',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  welcomeText: {
    fontSize: 14,
    color: '#78716c',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 13,
    color: '#44403c',
    fontWeight: '500',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3d9448',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#78716c',
    textAlign: 'center',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryAction: {
    backgroundColor: '#3d9448',
  },
  primaryIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  primaryIconText: {
    color: '#ffffff',
  },
  primaryTitle: {
    color: '#ffffff',
  },
  primarySubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  primaryChevron: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#e8f3ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionIconText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3d9448',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#78716c',
  },
  chevron: {
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '300',
  },
  recentContainer: {
    paddingHorizontal: 20,
  },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIcon: {
    fontSize: 20,
    color: '#3d9448',
  },
  activityCrop: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 2,
  },
  activityType: {
    fontSize: 13,
    color: '#78716c',
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  activityQuantity: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3d9448',
  },
  activityBags: {
    fontSize: 12,
    color: '#78716c',
  },
  activityTime: {
    fontSize: 13,
    color: '#a8a29e',
  },
});
