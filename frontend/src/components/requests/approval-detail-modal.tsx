import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '@/lib/auth-store';
import { API_ENDPOINTS } from '@/lib/api-config';
import type { Batch, BuyerType, PaymentMethod } from '@/lib/types';

interface ApprovalDetailModalProps {
  visible: boolean;
  request: any;
  onClose: () => void;
  onSuccess: () => void;
}

const BUYER_TYPES: { value: BuyerType; label: string }[] = [
  { value: 'AGGREGATOR', label: 'Aggregator' },
  { value: 'OFF_TAKER', label: 'Off-Taker' },
  { value: 'OPEN_MARKET', label: 'Open Market' },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'CASH', label: 'Cash', icon: '💵' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: '🏦' },
  { value: 'CHEQUE', label: 'Cheque', icon: '📝' },
  { value: 'IN_KIND', label: 'In-Kind', icon: '🤝' },
  { value: 'CREDIT', label: 'Credit', icon: '📋' },
];

export default function ApprovalDetailModal({ 
  visible, 
  request, 
  onClose, 
  onSuccess 
}: ApprovalDetailModalProps) {
  const { accessToken } = useAuthStore();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<{ batchId: string; bags: number }[]>([]);
  const [buyerType, setBuyerType] = useState<BuyerType>('AGGREGATOR');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [pricePerBag, setPricePerBag] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingBatches, setIsFetchingBatches] = useState(false);

  useEffect(() => {
    if (visible && request) {
      fetchBatches();
      // Pre-fill buyer name if provided by attendant
      if (request.buyer_name && request.buyer_name !== 'TBD') {
        setBuyerName(request.buyer_name);
      }
      if (request.notes) {
        setNotes(request.notes);
      }
    }
  }, [visible, request]);

  const fetchBatches = async () => {
    try {
      setIsFetchingBatches(true);
      const response = await fetch(
        `${API_ENDPOINTS.OWNER_BATCHES}?crop=${request.crop}&available=true`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        setBatches(data.data || []);
      }
    } catch (error) {
      console.error('Fetch batches error:', error);
    } finally {
      setIsFetchingBatches(false);
    }
  };

  const handleBatchSelection = (batchId: string, bags: number) => {
    const existing = selectedBatches.find(b => b.batchId === batchId);
    if (existing) {
      if (bags === 0) {
        setSelectedBatches(selectedBatches.filter(b => b.batchId !== batchId));
      } else {
        setSelectedBatches(selectedBatches.map(b => 
          b.batchId === batchId ? { ...b, bags } : b
        ));
      }
    } else if (bags > 0) {
      setSelectedBatches([...selectedBatches, { batchId, bags }]);
    }
  };

  const totalAllocated = selectedBatches.reduce((sum, b) => sum + b.bags, 0);
  const totalAmount = pricePerBag ? parseFloat(pricePerBag) * request.bag_quantity : 0;

  const handleApprove = async () => {
    // Validation
    if (selectedBatches.length > 0 && totalAllocated !== request.bag_quantity) {
      Alert.alert('Error', `Batch allocation mismatch: ${totalAllocated} allocated but ${request.bag_quantity} required`);
      return;
    }
    if (!buyerName.trim()) {
      Alert.alert('Error', 'Please enter buyer name');
      return;
    }
    if (!buyerPhone.trim()) {
      Alert.alert('Error', 'Please enter buyer phone');
      return;
    }
    if (!pricePerBag || parseFloat(pricePerBag) <= 0) {
      Alert.alert('Error', 'Please enter valid price per bag');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(API_ENDPOINTS.OWNER_APPROVE(request.request_id), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: notes || undefined,
          batchBreakdown: selectedBatches.length > 0 ? selectedBatches.map(b => ({
            batch_id: b.batchId,
            bags: b.bags,
          })) : undefined,
          buyerType,
          buyerNameFinal: buyerName,
          buyerPhoneFinal: buyerPhone,
          paymentMethod,
          pricePerBag: parseFloat(pricePerBag),
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Approved', 'Request approved successfully!');
        onSuccess();
        onClose();
      } else {
        throw new Error(data.error || 'Failed to approve');
      }
    } catch (error: any) {
      console.error('Approve error:', error);
      Alert.alert('Error', error.message || 'Failed to approve request');
    } finally {
      setIsLoading(false);
    }
  };

  if (!request) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Complete Approval</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          {/* Request Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{request.crop}</Text>
            <Text style={styles.summaryQuantity}>{request.bag_quantity} bags requested</Text>
          </View>

          {/* Batch Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 Batch Allocation (Optional)</Text>
            <Text style={styles.sectionHint}>
              Select batches to fulfill this request. Total must equal {request.bag_quantity} bags.
            </Text>
            
            {isFetchingBatches ? (
              <ActivityIndicator color="#3d9448" style={{ marginVertical: 20 }} />
            ) : batches.length === 0 ? (
              <Text style={styles.noBatches}>No batches available. You can approve without batch allocation.</Text>
            ) : (
              <>
                {batches.map((batch) => (
                  <BatchSelector
                    key={batch.id}
                    batch={batch}
                    allocated={selectedBatches.find(b => b.batchId === batch.id)?.bags || 0}
                    onSelect={(bags) => handleBatchSelection(batch.id, bags)}
                  />
                ))}
                <View style={styles.allocationSummary}>
                  <Text style={styles.allocationText}>
                    Allocated: {totalAllocated} / {request.bag_quantity} bags
                  </Text>
                  {totalAllocated > 0 && totalAllocated !== request.bag_quantity && (
                    <Text style={styles.allocationError}>❌ Mismatch</Text>
                  )}
                  {totalAllocated === request.bag_quantity && (
                    <Text style={styles.allocationSuccess}>✓ Complete</Text>
                  )}
                </View>
              </>
            )}
          </View>

          {/* Commercial Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💼 Commercial Details</Text>
            
            {/* Buyer Type */}
            <Text style={styles.label}>Buyer Classification</Text>
            <View style={styles.chipGroup}>
              {BUYER_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.chip, buyerType === type.value && styles.chipSelected]}
                  onPress={() => setBuyerType(type.value)}
                >
                  <Text style={[styles.chipText, buyerType === type.value && styles.chipTextSelected]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Buyer Name */}
            <Text style={styles.label}>Buyer Name</Text>
            <TextInput
              value={buyerName}
              onChangeText={setBuyerName}
              placeholder="Enter buyer's full name"
              placeholderTextColor="#a8a29e"
              style={styles.input}
            />

            {/* Buyer Phone */}
            <Text style={styles.label}>Buyer Phone</Text>
            <TextInput
              value={buyerPhone}
              onChangeText={setBuyerPhone}
              placeholder="Enter phone number"
              placeholderTextColor="#a8a29e"
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>

          {/* Payment Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💳 Payment Terms</Text>
            
            {/* Payment Method */}
            <Text style={styles.label}>Payment Method</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paymentScroll}>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[styles.paymentCard, paymentMethod === method.value && styles.paymentCardSelected]}
                  onPress={() => setPaymentMethod(method.value)}
                >
                  <Text style={styles.paymentIcon}>{method.icon}</Text>
                  <Text style={[styles.paymentText, paymentMethod === method.value && styles.paymentTextSelected]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {paymentMethod === 'CREDIT' && (
              <View style={styles.creditNotice}>
                <Text style={styles.creditNoticeText}>
                  ℹ️ Payment status will be set to PENDING. Attendant can confirm when received.
                </Text>
              </View>
            )}

            {/* Price Per Bag */}
            <Text style={styles.label}>Price Per Bag</Text>
            <TextInput
              value={pricePerBag}
              onChangeText={setPricePerBag}
              placeholder="Enter price per bag"
              placeholderTextColor="#a8a29e"
              keyboardType="decimal-pad"
              style={styles.input}
            />

            {totalAmount > 0 && (
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>GH₵{totalAmount.toFixed(2)}</Text>
              </View>
            )}

            {/* Notes */}
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes for attendant..."
              placeholderTextColor="#a8a29e"
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textArea]}
            />
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Approve Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.approveButton, isLoading && styles.approveButtonDisabled]}
            onPress={handleApprove}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.approveButtonText}>✓ Approve & Complete</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Batch Selector Component
function BatchSelector({ batch, allocated, onSelect }: { 
  batch: Batch; 
  allocated: number; 
  onSelect: (bags: number) => void;
}) {
  const [inputValue, setInputValue] = useState(allocated.toString());

  useEffect(() => {
    setInputValue(allocated > 0 ? allocated.toString() : '');
  }, [allocated]);

  const handleChange = (text: string) => {
    setInputValue(text);
    const num = parseInt(text) || 0;
    if (num <= batch.remainingBags) {
      onSelect(num);
    }
  };

  return (
    <View style={styles.batchCard}>
      <View style={styles.batchInfo}>
        <Text style={styles.batchTag}>Batch #{batch.id.slice(0, 8)}</Text>
        <Text style={styles.batchSource}>{batch.sourceType}</Text>
        <Text style={styles.batchAvailable}>{batch.remainingBags} bags available</Text>
      </View>
      <TextInput
        value={inputValue}
        onChangeText={handleChange}
        placeholder="0"
        placeholderTextColor="#a8a29e"
        keyboardType="number-pad"
        style={styles.batchInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f4',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 20,
    color: '#1c1917',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
  },
  modalScroll: {
    flex: 1,
  },
  summaryCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#e8f3ea',
    borderRadius: 16,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 4,
  },
  summaryQuantity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3d9448',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 14,
    color: '#78716c',
    marginBottom: 16,
  },
  noBatches: {
    fontSize: 14,
    color: '#78716c',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  batchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  batchInfo: {
    flex: 1,
  },
  batchTag: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 4,
  },
  batchSource: {
    fontSize: 13,
    color: '#78716c',
    marginBottom: 2,
  },
  batchAvailable: {
    fontSize: 13,
    color: '#3d9448',
    fontWeight: '500',
  },
  batchInput: {
    width: 80,
    backgroundColor: '#f5f5f4',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
    textAlign: 'center',
  },
  allocationSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  allocationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
  },
  allocationError: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  allocationSuccess: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3d9448',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 8,
    marginTop: 16,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    borderRadius: 12,
  },
  chipSelected: {
    backgroundColor: '#e8f3ea',
    borderColor: '#3d9448',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78716c',
  },
  chipTextSelected: {
    color: '#3d9448',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1c1917',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  paymentScroll: {
    marginBottom: 12,
  },
  paymentCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginRight: 12,
    minWidth: 100,
  },
  paymentCardSelected: {
    backgroundColor: '#e8f3ea',
    borderColor: '#3d9448',
  },
  paymentIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  paymentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78716c',
  },
  paymentTextSelected: {
    color: '#3d9448',
  },
  creditNotice: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  creditNoticeText: {
    fontSize: 13,
    color: '#92400e',
  },
  totalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e8f3ea',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3d9448',
  },
  footer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e7e5e4',
  },
  approveButton: {
    backgroundColor: '#3d9448',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#3d9448',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  approveButtonDisabled: {
    backgroundColor: '#d6d3d1',
    shadowOpacity: 0,
    elevation: 0,
  },
  approveButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
});
