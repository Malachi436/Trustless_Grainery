import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import {
  Package,
  PackagePlus,
  PackageMinus,
  CheckCircle,
  XCircle,
  Send,
  Camera,
} from '@/lib/icons';
import type { AuditEvent } from '@/lib/types';
import { Badge, EmptyState } from '../ui';
import { format } from 'date-fns';

interface AuditTimelineProps {
  events: AuditEvent[];
  onPhotoPress?: (photoUri: string) => void;
}

export function AuditTimeline({ events, onPhotoPress }: AuditTimelineProps) {
  if (events.length === 0) {
    return (
      <View className="bg-white rounded-xl p-6">
        <EmptyState
          icon={<Package size={32} color="#a8a29e" />}
          title="No Activity"
          message="No warehouse events recorded yet"
        />
      </View>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'genesis_inventory':
        return <Package size={20} color="#3d9448" />;
      case 'inbound':
        return <PackagePlus size={20} color="#16a34a" />;
      case 'outbound_request':
        return <PackageMinus size={20} color="#ab8661" />;
      case 'approval':
        return <CheckCircle size={20} color="#16a34a" />;
      case 'rejection':
        return <XCircle size={20} color="#b91c1c" />;
      case 'dispatch':
        return <Send size={20} color="#3d9448" />;
      default:
        return <Package size={20} color="#78716c" />;
    }
  };

  const getEventLabel = (type: string) => {
    const labels: Record<string, string> = {
      genesis_inventory: 'Genesis',
      inbound: 'Inbound',
      outbound_request: 'Request',
      approval: 'Approved',
      rejection: 'Rejected',
      dispatch: 'Dispatch',
    };
    return labels[type] || type;
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'genesis_inventory':
      case 'inbound':
      case 'approval':
        return 'success';
      case 'rejection':
        return 'danger';
      case 'outbound_request':
      case 'dispatch':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <View>
      {events.map((event, index) => (
        <View key={event.id} className="flex-row mb-4">
          {/* Timeline line */}
          <View className="items-center mr-4">
            <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center">
              {getEventIcon(event.type)}
            </View>
            {index < events.length - 1 && (
              <View className="flex-1 w-0.5 bg-neutral-200 my-1" style={{ minHeight: 40 }} />
            )}
          </View>

          {/* Event content */}
          <View className="flex-1 bg-white rounded-xl p-4 border border-neutral-200">
            <View className="flex-row items-start justify-between mb-2">
              <Badge variant={getEventColor(event.type)}>
                {getEventLabel(event.type)}
              </Badge>
              <Text className="text-xs text-neutral-400">
                {format(new Date(event.timestamp), 'MMM d, h:mm a')}
              </Text>
            </View>

            {/* Crop and quantity */}
            {event.cropType && event.bagCount && (
              <Text className="text-base font-semibold text-neutral-800 mb-1 capitalize">
                {event.cropType}: {event.bagCount} bags
              </Text>
            )}

            {/* Actor */}
            <Text className="text-sm text-neutral-600 mb-2">
              By {event.actor}
            </Text>

            {/* Details */}
            {event.details && (
              <Text className="text-sm text-neutral-500 mb-2">
                {event.details}
              </Text>
            )}

            {/* Photo */}
            {event.photoUri && onPhotoPress && (
              <Pressable
                onPress={() => onPhotoPress(event.photoUri!)}
                className="flex-row items-center mt-2"
              >
                <Camera size={16} color="#3d9448" />
                <Text className="text-sm font-medium text-primary-600 ml-2">
                  View Photo
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
