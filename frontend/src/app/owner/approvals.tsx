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

// Mock data for pending approvals
const MOCK_APPROVALS = [
  {
    id: '1',
    cropType: 'Maize',
    quantity: 25,
    buyer: 'Kwame Asante',
    phone: '+233 24 555 1234',
    submittedBy: 'James Okonkwo',
    timeAgo: '2 hours ago',
    status: 'pending',
  },
  {
    id: '2',
    cropType: 'Rice',
    quantity: 15,
    buyer: 'Amina Diallo',
    phone: '+233 20 888 5678',
    submittedBy: 'James Okonkwo',
    timeAgo: '45 minutes ago',
    status: 'pending',
  },
];

export default function ApprovalsScreen() {
  const router = useRouter();
  const [approvals, setApprovals] = useState(MOCK_APPROVALS);

  const handleApprove = (id: string) => {
    Alert.alert(
      'Approve Request',
      'Are you sure you want to approve this dispatch request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: () => {
            setApprovals(prev => prev.filter(a => a.id !== id));
            Alert.alert('✅ Approved', 'Request has been approved. Attendant can now dispatch.');
          },
        },
      ]
    );
  };

  const handleReject = (id: string) => {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this dispatch request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            setApprovals(prev => prev.filter(a => a.id !== id));
            Alert.alert('❌ Rejected', 'Request has been rejected.');
          },
        },
      ]
    );
  };

  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  const totalBags = approvals.reduce((sum, a) => sum + a.quantity, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f4" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>✅ Approvals</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {pendingCount} request{pendingCount !== 1 ? 's' : ''} pending approval
          </Text>
          <Text style={styles.summaryBags}>{totalBags} bags requested</Text>
        </View>

        {/* Approvals List */}
        {approvals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>No pending approvals at the moment</Text>
          </View>
        ) : (
          approvals.map((approval) => (
            <View key={approval.id} style={styles.approvalCard}>
              {/* Crop Header */}
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cropName}>{approval.cropType}</Text>
                  <Text style={styles.quantity}>{approval.quantity} bags requested</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Pending</Text>
                </View>
              </View>

              {/* Buyer Info */}
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>👤</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Buyer</Text>
                  <Text style={styles.infoValue}>{approval.buyer}</Text>
                </View>
              </View>

              {/* Phone */}
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>📱</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{approval.phone}</Text>
                </View>
              </View>

              {/* Submitted By */}
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>👤</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Submitted by</Text>
                  <Text style={styles.infoValue}>{approval.submittedBy}</Text>
                </View>
              </View>

              {/* Time */}
              <View style={styles.timeContainer}>
                <Text style={styles.timeIcon}>🕐</Text>
                <Text style={styles.timeText}>{approval.timeAgo}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleReject(approval.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rejectIcon}>✕</Text>
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApprove(approval.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.approveIcon}>✓</Text>
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

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
  scrollView: {
    flex: 1,
  },
  summary: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  summaryText: {
    fontSize: 15,
    color: '#78716c',
    marginBottom: 4,
  },
  summaryBags: {
    fontSize: 17,
    fontWeight: '600',
    color: '#3d9448',
  },
  approvalCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  cropName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 15,
    color: '#3d9448',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b45309',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#78716c',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  timeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  timeText: {
    fontSize: 13,
    color: '#78716c',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
  },
  rejectIcon: {
    fontSize: 18,
    color: '#dc2626',
  },
  rejectText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3d9448',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
    shadowColor: '#3d9448',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  approveIcon: {
    fontSize: 18,
    color: '#ffffff',
  },
  approveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#78716c',
    textAlign: 'center',
  },
});
