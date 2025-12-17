import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';

export default function OwnerHomeScreen() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const [showAllCrops, setShowAllCrops] = useState(false);

  const allCrops = [
    { name: 'Maize', quantity: 120 },
    { name: 'Rice', quantity: 60 },
    { name: 'Soybeans', quantity: 85 },
    { name: 'Wheat', quantity: 45 },
    { name: 'Millet', quantity: 30 },
  ];

  const visibleCrops = showAllCrops ? allCrops : allCrops.slice(0, 3);
  const hiddenCount = allCrops.length - 3;

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

  const showInboundDetails = () => {
    Alert.alert(
      'Today\'s Inbound 📥',
      'Total: 85 bags\n\n' +
      'Breakdown:\n' +
      '• Maize: 50 bags (Farm A)\n' +
      '• Soybeans: 35 bags (Farm B)\n\n' +
      'All entries logged by James Okonkwo',
      [{ text: 'OK' }]
    );
  };

  const showOutboundDetails = () => {
    Alert.alert(
      'Today\'s Outbound 📤',
      'Total: 35 bags\n\n' +
      'Breakdown:\n' +
      '• Rice: 20 bags (Kofi Mensah)\n' +
      '• Wheat: 15 bags (Fatima Owusu)\n\n' +
      'All dispatches by James Okonkwo',
      [{ text: 'OK' }]
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
              <Text style={styles.avatarIcon}>👑</Text>
            </View>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>Sarah Mensah</Text>
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

        {/* Total Stock Card */}
        <View style={styles.totalStockCard}>
          <View style={styles.stockHeader}>
            <View style={styles.stockIconContainer}>
              <Text style={styles.stockIcon}>📦</Text>
            </View>
            <Text style={styles.stockTitle}>Total Stock</Text>
          </View>
          <Text style={styles.stockNumber}>340</Text>
          <Text style={styles.stockSubtitle}>bags across 5 crops</Text>
          
          <View style={styles.cropTags}>
            {visibleCrops.map((crop, index) => (
              <View key={index} style={styles.cropTag}>
                <Text style={styles.cropTagText}>{crop.name}: {crop.quantity}</Text>
              </View>
            ))}
            {!showAllCrops && hiddenCount > 0 && (
              <TouchableOpacity
                style={styles.cropTagMore}
                onPress={() => setShowAllCrops(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.cropTagMoreText}>+{hiddenCount} more</Text>
              </TouchableOpacity>
            )}
            {showAllCrops && (
              <TouchableOpacity
                style={styles.cropTagMore}
                onPress={() => setShowAllCrops(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cropTagMoreText}>Show less</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Today's Activity */}
        <View style={styles.activityRow}>
          {/* Inbound */}
          <TouchableOpacity
            style={styles.activityCard}
            onPress={showInboundDetails}
            activeOpacity={0.7}
          >
            <View style={styles.activityIconContainer}>
              <Text style={styles.activityIcon}>📥</Text>
            </View>
            <Text style={styles.activityNumber}>85</Text>
            <Text style={styles.activityLabel}>bags</Text>
            <Text style={styles.activityDate}>Today</Text>
            <Text style={styles.activityType}>Inbound</Text>
          </TouchableOpacity>

          {/* Outbound */}
          <TouchableOpacity
            style={styles.activityCard}
            onPress={showOutboundDetails}
            activeOpacity={0.7}
          >
            <View style={styles.activityIconContainer}>
              <Text style={styles.activityIcon}>📤</Text>
            </View>
            <Text style={styles.activityNumber}>35</Text>
            <Text style={styles.activityLabel}>bags</Text>
            <Text style={styles.activityDate}>Today</Text>
            <Text style={styles.activityType}>Outbound</Text>
          </TouchableOpacity>
        </View>

        {/* Approvals */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push('/owner/approvals')}
          activeOpacity={0.7}
        >
          <View style={styles.menuCardLeft}>
            <View style={styles.menuIconContainer}>
              <Text style={styles.menuIcon}>✅</Text>
            </View>
            <View>
              <Text style={styles.menuTitle}>Approvals</Text>
              <Text style={styles.menuSubtitle}>Review pending sale requests</Text>
            </View>
          </View>
          <View style={styles.menuCardRight}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>2</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Transaction History */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push('/owner/audit-timeline')}
          activeOpacity={0.7}
        >
          <View style={styles.menuCardLeft}>
            <View style={styles.menuIconContainer}>
              <Text style={styles.menuIcon}>🕐</Text>
            </View>
            <View>
              <Text style={styles.menuTitle}>Transaction History</Text>
              <Text style={styles.menuSubtitle}>View all stock movements</Text>
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

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
    backgroundColor: '#f0e9df',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    fontSize: 24,
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
  totalStockCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#3d9448',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#3d9448',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  stockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  stockIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockIcon: {
    fontSize: 22,
  },
  stockTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#ffffff',
  },
  stockNumber: {
    fontSize: 64,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  stockSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  cropTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cropTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cropTagText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  cropTagMore: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cropTagMoreText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  activityRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 20,
  },
  activityCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  activityIcon: {
    fontSize: 20,
  },
  activityNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 2,
  },
  activityLabel: {
    fontSize: 13,
    color: '#78716c',
    marginBottom: 8,
  },
  activityDate: {
    fontSize: 13,
    color: '#3d9448',
    fontWeight: '500',
    marginBottom: 2,
  },
  activityType: {
    fontSize: 13,
    color: '#a8a29e',
  },
  menuCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  menuCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0f9f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 24,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#78716c',
  },
  menuCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 28,
    color: '#d6d3d1',
    fontWeight: '300',
  },
});
