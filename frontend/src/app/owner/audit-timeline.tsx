import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const { accessToken } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    fetchAuditLog();
  }, []);

  const fetchAuditLog = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(API_ENDPOINTS.OWNER_AUDIT, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        console.log('===== AUDIT LOG DATA =====');
        console.log('Total events:', data.data?.length);
        if (data.data && data.data.length > 0) {
          console.log('First event:', JSON.stringify(data.data[0], null, 2));
          // Find DISPATCH_EXECUTED events
          const dispatchEvents = data.data.filter((e: any) => e.event_type === 'DISPATCH_EXECUTED');
          console.log('Dispatch executed events:', dispatchEvents.length);
          if (dispatchEvents.length > 0) {
            console.log('First dispatch event:', JSON.stringify(dispatchEvents[0], null, 2));
            console.log('Payload:', dispatchEvents[0].payload);
            console.log('Photo URLs:', dispatchEvents[0].payload?.photo_urls);
          }
        }
        console.log('========================');
        setTransactions(data.data || []);
      } else {
        console.error('Failed to fetch audit log:', data.error);
      }
    } catch (error) {
      console.error('Fetch audit error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const inboundCount = transactions.filter(t => 
    t.event_type === 'STOCK_INBOUND_RECORDED' || t.event_type === 'INBOUND_LOGGED'
  ).length;
  const outboundCount = transactions.filter(t => 
    t.event_type === 'DISPATCH_EXECUTED' || t.event_type === 'DISPATCH_APPROVED'
  ).length;

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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3d9448" />
            <Text style={styles.loadingText}>Loading audit log...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
            <Text style={styles.emptySubtitle}>Audit events will appear here</Text>
          </View>
        ) : (
          transactions.map((event) => {
            // Determine event type
            const isInbound = event.event_type === 'STOCK_INBOUND_RECORDED' || 
                             event.event_type === 'INBOUND_LOGGED';
            const isOutbound = event.event_type === 'DISPATCH_EXECUTED' || 
                              event.event_type === 'DISPATCH_APPROVED';
            
            if (!isInbound && !isOutbound) return null;

            const payload = event.payload || {};
            const type = isInbound ? 'inbound' : 'outbound';
            const cropType = payload.crop || payload.cropType || 'Unknown';
            const quantity = payload.bag_quantity || payload.bagQuantity || payload.bags || 0;
            
            // Get source - filter out base64 image data
            let source = payload.source || payload.notes || '';
            let photoUrl = '';
            if (source && (source.startsWith('data:image') || source.startsWith('http'))) {
              photoUrl = source; // Store photo URL
              source = ''; // Hide base64 or URL data from source text
            }
            
            // Also check for photo_urls array
            if (payload.photo_urls && payload.photo_urls.length > 0) {
              photoUrl = payload.photo_urls[0];
            }
            
            // Debug logging for DISPATCH_EXECUTED events
            if (event.event_type === 'DISPATCH_EXECUTED') {
              console.log('DISPATCH_EXECUTED event found:', event.event_id);
              console.log('Payload:', payload);
              console.log('Photo URL found:', photoUrl);
            }
            
            const buyer = payload.buyer || '';
            
            // Format date
            const eventDate = new Date(event.created_at);
            const now = new Date();
            const diffMs = now.getTime() - eventDate.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);
            
            let dateStr = '';
            if (diffHours < 1) {
              dateStr = 'Just now';
            } else if (diffHours < 24) {
              dateStr = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            } else if (diffDays === 1) {
              dateStr = 'Yesterday';
            } else if (diffDays < 7) {
              dateStr = `${diffDays} days ago`;
            } else {
              dateStr = eventDate.toLocaleDateString();
            }

            return (
          <View key={event.event_id} style={styles.transactionCard}>
            {/* Header */}
            <View style={styles.transactionHeader}>
              <View style={styles.transactionLeft}>
                <View style={[
                  styles.typeIconContainer,
                  type === 'inbound' ? styles.inboundBg : styles.outboundBg
                ]}>
                  <Text style={styles.typeIcon}>
                  {type === 'inbound' ? '📥' : '📤'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.cropType}>{cropType}</Text>
                  <Text style={[
                    styles.transactionType,
                    type === 'inbound' ? styles.inboundText : styles.outboundText
                  ]}>
                    {type === 'inbound' ? 'Inbound' : 'Outbound'}
                  </Text>
                </View>
              </View>
              <View style={styles.quantityContainer}>
                <Text style={[
                  styles.quantitySign,
                  type === 'inbound' ? styles.inboundText : styles.outboundText
                ]}>
                  {type === 'inbound' ? '+' : '-'}
                </Text>
                <Text style={styles.quantity}>{Math.abs(quantity) || 0}</Text>
                <Text style={styles.bagsLabel}>bags</Text>
              </View>
            </View>

            {/* Details */}
            {source && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Source:</Text>
                <Text style={styles.detailValue}>{source}</Text>
              </View>
            )}
            {buyer && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Buyer:</Text>
                <Text style={styles.detailValue}>{buyer}</Text>
              </View>
            )}

            {/* Photo Button */}
            {photoUrl && (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => {
                  setSelectedPhoto(photoUrl);
                  setShowPhotoModal(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.photoButtonIcon}>📷</Text>
                <Text style={styles.photoButtonText}>View Photo</Text>
              </TouchableOpacity>
            )}

            {/* Footer */}
            <View style={styles.transactionFooter}>
              <View style={styles.attendantInfo}>
                <Text style={styles.attendantIcon}>👤</Text>
                <Text style={styles.attendantName}>System</Text>
              </View>
              <View style={styles.dateInfo}>
                <Text style={styles.dateIcon}>📅</Text>
                <Text style={styles.dateText}>{dateStr}</Text>
              </View>
            </View>
          </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Photo Modal */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowPhotoModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Transaction Photo</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowPhotoModal(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              {selectedPhoto && (
                <Image
                  source={{ uri: selectedPhoto }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f4',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#78716c',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptySubtitle: {
    fontSize: 15,
    color: '#78716c',
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
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f3ea',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  photoButtonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3d9448',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH - 40,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#78716c',
  },
  modalImage: {
    width: SCREEN_WIDTH - 40,
    height: 400,
    backgroundColor: '#f5f5f4',
  },
});
