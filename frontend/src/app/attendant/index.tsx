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
  const [approvedRequests, setApprovedRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchApprovedRequests();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchApprovedRequests();
    }, 30000);
    
    return () => clearInterval(interval);
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

  const fetchApprovedRequests = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ATTENDANT_MY_REQUESTS, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Filter only approved requests
        const approved = data.data.filter((req: any) => req.status === 'APPROVED');
        setApprovedRequests(approved);
      }
    } catch (error) {
      console.error('Fetch approved requests error:', error);
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
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

        {/* Current Stock */}
        <View style={styles.stockContainer}>
          <Text style={styles.sectionTitle}>Current Stock</Text>
          {isLoading ? (
            <View style={styles.stockCard}>
              <Text style={styles.stockLabel}>Loading...</Text>
            </View>
          ) : stats?.stock && stats.stock.length > 0 ? (
            <View style={styles.stockGrid}>
              {stats.stock.map((item: any, index: number) => (
                <View key={index} style={styles.stockCard}>
                  <Text style={styles.stockCrop}>{item.crop}</Text>
                  <Text style={styles.stockQuantity}>{item.bag_count || item.bagCount || 0}</Text>
                  <Text style={styles.stockLabel}>bags</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.stockCard}>
              <Text style={styles.stockLabel}>No stock data</Text>
            </View>
          )}
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

        {/* Pending Approvals - NEW SECTION */}
        {approvedRequests.length > 0 && (
          <View style={styles.approvalsContainer}>
            <View style={styles.approvalHeader}>
              <Text style={styles.sectionTitle}>Awaiting Execution</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{approvedRequests.length}</Text>
              </View>
            </View>
            
            {approvedRequests.map((request: any) => (
              <TouchableOpacity
                key={request.request_id}
                style={styles.approvalCard}
                onPress={() => router.push(`/attendant/execute-dispatch/${request.request_id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.approvalLeft}>
                  <View style={styles.approvalIconContainer}>
                    <Text style={styles.approvalIcon}>✓</Text>
                  </View>
                  <View>
                    <Text style={styles.approvalCrop}>{request.crop}</Text>
                    <Text style={styles.approvalBuyer}>Buyer: {request.buyer_name || 'TBD'}</Text>
                  </View>
                </View>
                <View style={styles.approvalRight}>
                  <Text style={styles.approvalQuantity}>{request.bag_quantity}</Text>
                  <Text style={styles.approvalBags}>bags</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.recentContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          {isLoading ? (
            <View style={styles.activityCard}>
              <Text style={styles.activityType}>Loading...</Text>
            </View>
          ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
            stats.recentActivity.map((activity: any, index: number) => (
              <View key={activity.eventId || index} style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <View style={styles.activityLeft}>
                    <View style={styles.activityIconContainer}>
                      <Text style={styles.activityIcon}>
                        {activity.type === 'INBOUND' ? '↓' : '↑'}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.activityCrop}>{activity.crop}</Text>
                      <Text style={styles.activityType}>
                        {activity.type === 'INBOUND' ? 'Inbound' : 'Outbound'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.activityRight}>
                    <Text style={styles.activityQuantity}>
                      {activity.type === 'INBOUND' ? '+' : '-'}{activity.bags}
                    </Text>
                    <Text style={styles.activityBags}>bags</Text>
                  </View>
                </View>
                <Text style={styles.activityTime}>
                  {getTimeAgo(activity.timestamp)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.activityCard}>
              <Text style={styles.activityType}>No recent activity</Text>
            </View>
          )}
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
  stockContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  stockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stockCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    minWidth: '30%',
    flex: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  stockCrop: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 8,
  },
  stockQuantity: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3d9448',
    marginBottom: 2,
  },
  stockLabel: {
    fontSize: 12,
    color: '#78716c',
  },
  approvalsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  approvalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#3d9448',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  approvalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#fcd34d',
  },
  approvalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  approvalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f59e0b',
  },
  approvalCrop: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 2,
  },
  approvalBuyer: {
    fontSize: 13,
    color: '#78716c',
  },
  approvalRight: {
    alignItems: 'flex-end',
  },
  approvalQuantity: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f59e0b',
  },
  approvalBags: {
    fontSize: 12,
    color: '#78716c',
  },
});
