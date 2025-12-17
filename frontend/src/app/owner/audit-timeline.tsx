import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// Mock transaction data
const MOCK_TRANSACTIONS = [
  {
    id: '1',
    type: 'inbound',
    cropType: 'Maize',
    quantity: 50,
    source: 'Farm A - North Field',
    buyer: null,
    attendant: 'James Okonkwo',
    date: 'Yesterday',
  },
  {
    id: '2',
    type: 'outbound',
    cropType: 'Rice',
    quantity: 20,
    source: null,
    buyer: 'Kofi Mensah',
    attendant: 'James Okonkwo',
    date: '2 days ago',
  },
  {
    id: '3',
    type: 'inbound',
    cropType: 'Soybeans',
    quantity: 35,
    source: 'Farm B - East Field',
    buyer: null,
    attendant: 'James Okonkwo',
    date: '3 days ago',
  },
  {
    id: '4',
    type: 'outbound',
    cropType: 'Wheat',
    quantity: 15,
    source: null,
    buyer: 'Fatima Owusu',
    attendant: 'James Okonkwo',
    date: '3 days ago',
  },
];

export default function AuditTimelineScreen() {
  const router = useRouter();

  const inboundCount = MOCK_TRANSACTIONS.filter(t => t.type === 'inbound').length;
  const outboundCount = MOCK_TRANSACTIONS.filter(t => t.type === 'outbound').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f4" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🕐 Transaction History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>Read-only record of all stock movements</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>📥</Text>
          </View>
          <Text style={styles.statNumber}>{inboundCount}</Text>
          <Text style={styles.statLabel}>Inbound</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>📤</Text>
          </View>
          <Text style={styles.statNumber}>{outboundCount}</Text>
          <Text style={styles.statLabel}>Outbound</Text>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
      </View>

      {/* Transactions List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {MOCK_TRANSACTIONS.map((transaction) => (
          <View key={transaction.id} style={styles.transactionCard}>
            {/* Header */}
            <View style={styles.transactionHeader}>
              <View style={styles.transactionLeft}>
                <View style={[
                  styles.typeIconContainer,
                  transaction.type === 'inbound' ? styles.inboundBg : styles.outboundBg
                ]}>
                  <Text style={styles.typeIcon}>
                    {transaction.type === 'inbound' ? '📥' : '📤'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.cropType}>{transaction.cropType}</Text>
                  <Text style={[
                    styles.transactionType,
                    transaction.type === 'inbound' ? styles.inboundText : styles.outboundText
                  ]}>
                    {transaction.type === 'inbound' ? 'Inbound' : 'Outbound'}
                  </Text>
                </View>
              </View>
              <View style={styles.quantityContainer}>
                <Text style={[
                  styles.quantitySign,
                  transaction.type === 'inbound' ? styles.inboundText : styles.outboundText
                ]}>
                  {transaction.type === 'inbound' ? '+' : '-'}
                </Text>
                <Text style={styles.quantity}>{transaction.quantity}</Text>
                <Text style={styles.bagsLabel}>bags</Text>
              </View>
            </View>

            {/* Details */}
            {transaction.source && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Source:</Text>
                <Text style={styles.detailValue}>{transaction.source}</Text>
              </View>
            )}
            {transaction.buyer && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Buyer:</Text>
                <Text style={styles.detailValue}>{transaction.buyer}</Text>
              </View>
            )}

            {/* Footer */}
            <View style={styles.transactionFooter}>
              <View style={styles.attendantInfo}>
                <Text style={styles.attendantIcon}>👤</Text>
                <Text style={styles.attendantName}>{transaction.attendant}</Text>
              </View>
              <View style={styles.dateInfo}>
                <Text style={styles.dateIcon}>📅</Text>
                <Text style={styles.dateText}>{transaction.date}</Text>
              </View>
            </View>
          </View>
        ))}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#1c1917',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1917',
  },
  infoBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#e8f3ea',
    borderRadius: 12,
    padding: 12,
  },
  infoBannerText: {
    fontSize: 14,
    color: '#3d9448',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 20,
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
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 20,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#78716c',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
  },
  scrollView: {
    flex: 1,
  },
  transactionCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inboundBg: {
    backgroundColor: '#e8f3ea',
  },
  outboundBg: {
    backgroundColor: '#fef2f2',
  },
  typeIcon: {
    fontSize: 20,
  },
  cropType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 13,
    fontWeight: '600',
  },
  inboundText: {
    color: '#3d9448',
  },
  outboundText: {
    color: '#dc2626',
  },
  quantityContainer: {
    alignItems: 'flex-end',
  },
  quantitySign: {
    fontSize: 20,
    fontWeight: '700',
  },
  quantity: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1917',
  },
  bagsLabel: {
    fontSize: 12,
    color: '#78716c',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#78716c',
    marginRight: 6,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1917',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f4',
  },
  attendantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendantIcon: {
    fontSize: 14,
  },
  attendantName: {
    fontSize: 13,
    color: '#78716c',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateIcon: {
    fontSize: 14,
  },
  dateText: {
    fontSize: 13,
    color: '#78716c',
  },
});
