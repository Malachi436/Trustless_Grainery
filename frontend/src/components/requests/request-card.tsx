import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Phone, User, Clock, ChevronRight } from '@/lib/icons';
import type { OutboundRequest } from '@/lib/types';
import { Badge, EmptyState } from '../ui';
import { formatDistanceToNow } from 'date-fns';

interface RequestCardProps {
  request: OutboundRequest;
  onPress?: () => void;
  showBuyerInfo?: boolean;
}

export function RequestCard({ request, onPress, showBuyerInfo = true }: RequestCardProps) {
  const statusVariant = {
    pending: 'warning' as const,
    approved: 'success' as const,
    rejected: 'danger' as const,
    dispatched: 'default' as const,
  };

  const statusLabel = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    dispatched: 'Dispatched',
  };

  const timeAgo = formatDistanceToNow(new Date(request.createdAt), { addSuffix: true });

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="bg-white rounded-xl p-4 mb-3 border border-neutral-200"
    >
      {/* Header */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-neutral-800 capitalize">
            {request.cropType}
          </Text>
          <Text className="text-2xl font-bold text-primary-600 mt-1">
            {request.bagCount} bags
          </Text>
        </View>
        <View className="items-end">
          <Badge variant={statusVariant[request.status]}>
            {statusLabel[request.status]}
          </Badge>
          {onPress && (
            <ChevronRight size={20} color="#a8a29e" className="mt-2" />
          )}
        </View>
      </View>

      {/* Buyer Info */}
      {showBuyerInfo && (
        <View className="space-y-2 mb-3">
          <View className="flex-row items-center">
            <User size={16} color="#78716c" />
            <Text className="text-sm text-neutral-700 ml-2 font-medium">
              {request.buyerName}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Phone size={16} color="#78716c" />
            <Text className="text-sm text-neutral-600 ml-2">
              {request.buyerContact}
            </Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <View className="flex-row items-center justify-between pt-3 border-t border-neutral-100">
        <View className="flex-row items-center">
          <Clock size={14} color="#a8a29e" />
          <Text className="text-xs text-neutral-500 ml-1">{timeAgo}</Text>
        </View>
        <Text className="text-xs text-neutral-400">
          By {request.requestedBy}
        </Text>
      </View>

      {/* Ready to dispatch indicator */}
      {request.status === 'approved' && (
        <View className="mt-3 bg-success-50 rounded-lg p-2">
          <Text className="text-xs font-medium text-success-700 text-center">
            Ready to dispatch
          </Text>
        </View>
      )}
    </Pressable>
  );
}

interface PendingRequestListProps {
  requests: OutboundRequest[];
  onRequestPress?: (request: OutboundRequest) => void;
  emptyMessage?: string;
}

export function PendingRequestList({
  requests,
  onRequestPress,
  emptyMessage = 'No requests found',
}: PendingRequestListProps) {
  if (requests.length === 0) {
    return (
      <View className="bg-white rounded-xl p-6 border border-neutral-200">
        <EmptyState
          title="No Requests"
          message={emptyMessage}
        />
      </View>
    );
  }

  return (
    <View>
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          onPress={onRequestPress ? () => onRequestPress(request) : undefined}
        />
      ))}
    </View>
  );
}
