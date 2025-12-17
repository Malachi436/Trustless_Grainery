import React from 'react';
import { View, Text } from 'react-native';
import { Package, TrendingUp, TrendingDown } from '@/lib/icons';
import type { StockItem } from '@/lib/types';
import { GlassCard, EmptyState } from '../ui';

interface StockSummaryProps {
  items: StockItem[];
}

export function StockSummary({ items }: StockSummaryProps) {
  const totalBags = items.reduce((sum, item) => sum + item.bagCount, 0);
  const cropCount = items.length;

  if (items.length === 0) {
    return (
      <GlassCard className="mb-6">
        <EmptyState
          icon={<Package size={32} color="#a8a29e" />}
          title="No Stock"
          message="No inventory recorded yet"
        />
      </GlassCard>
    );
  }

  return (
    <View className="mb-6">
      {/* Total Stock Card */}
      <GlassCard className="mb-4" intensity={50}>
        <View className="flex-row items-center mb-3">
          <View className="w-12 h-12 rounded-xl bg-primary-100 items-center justify-center mr-3">
            <Package size={24} color="#3d9448" />
          </View>
          <View className="flex-1">
            <Text className="text-sm text-neutral-500">Total Stock</Text>
            <Text className="text-3xl font-bold text-neutral-800">{totalBags}</Text>
          </View>
        </View>
        <Text className="text-sm text-neutral-600">
          bags across {cropCount} crop{cropCount !== 1 ? 's' : ''}
        </Text>
        
        {/* Crop breakdown pills */}
        <View className="flex-row flex-wrap gap-2 mt-4">
          {items.slice(0, 3).map((item) => (
            <View
              key={item.cropType}
              className="bg-primary-100 px-3 py-1.5 rounded-full"
            >
              <Text className="text-xs font-medium text-primary-700 capitalize">
                {item.cropType}: {item.bagCount}
              </Text>
            </View>
          ))}
          {items.length > 3 && (
            <View className="bg-neutral-200 px-3 py-1.5 rounded-full">
              <Text className="text-xs font-medium text-neutral-600">
                +{items.length - 3} more
              </Text>
            </View>
          )}
        </View>
      </GlassCard>

      {/* Individual Crop Cards */}
      <View className="space-y-3">
        {items.map((item) => (
          <View
            key={item.cropType}
            className="bg-white rounded-xl p-4 border border-neutral-200"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-base font-semibold text-neutral-800 capitalize">
                  {item.cropType}
                </Text>
                <Text className="text-sm text-neutral-500 mt-0.5">
                  Current inventory
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-2xl font-bold text-primary-600">
                  {item.bagCount}
                </Text>
                <Text className="text-xs text-neutral-500">bags</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

interface TodayStatsProps {
  inbound: number;
  outbound: number;
}

export function TodayStats({ inbound, outbound }: TodayStatsProps) {
  return (
    <View className="flex-row gap-3 mb-6">
      <View className="flex-1 bg-white rounded-xl p-4 border border-success-200">
        <View className="flex-row items-center mb-1">
          <TrendingUp size={18} color="#16a34a" />
          <Text className="text-sm font-medium text-neutral-600 ml-2">Inbound</Text>
        </View>
        <Text className="text-2xl font-bold text-success-600">{inbound}</Text>
        <Text className="text-xs text-neutral-500">bags</Text>
        <Text className="text-xs text-success-600 mt-1">Today</Text>
      </View>

      <View className="flex-1 bg-white rounded-xl p-4 border border-sand-200">
        <View className="flex-row items-center mb-1">
          <TrendingDown size={18} color="#ab8661" />
          <Text className="text-sm font-medium text-neutral-600 ml-2">Outbound</Text>
        </View>
        <Text className="text-2xl font-bold text-sand-600">{outbound}</Text>
        <Text className="text-xs text-neutral-500">bags</Text>
        <Text className="text-xs text-sand-600 mt-1">Today</Text>
      </View>
    </View>
  );
}
