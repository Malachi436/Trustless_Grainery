// Icon components using @expo/vector-icons (Expo Go compatible)
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';

type IconProps = {
  size?: number;
  color?: string;
};

// Map lucide icon names to expo vector icons
export const Warehouse = ({ size = 24, color = '#000' }: IconProps) => (
  <MaterialCommunityIcons name="warehouse" size={size} color={color} />
);

export const Phone = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="phone" size={size} color={color} />
);

export const Lock = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="lock" size={size} color={color} />
);

export const AlertCircle = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="alert-circle" size={size} color={color} />
);

export const Package = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="package" size={size} color={color} />
);

export const PackagePlus = ({ size = 24, color = '#000' }: IconProps) => (
  <MaterialCommunityIcons name="package-variant-plus" size={size} color={color} />
);

export const PackageMinus = ({ size = 24, color = '#000' }: IconProps) => (
  <MaterialCommunityIcons name="package-variant-minus" size={size} color={color} />
);

export const User = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="user" size={size} color={color} />
);

export const LogOut = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="log-out" size={size} color={color} />
);

export const RefreshCw = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="refresh-cw" size={size} color={color} />
);

export const ClipboardCheck = ({ size = 24, color = '#000' }: IconProps) => (
  <MaterialCommunityIcons name="clipboard-check-outline" size={size} color={color} />
);

export const History = ({ size = 24, color = '#000' }: IconProps) => (
  <MaterialIcons name="history" size={size} color={color} />
);

export const Bell = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="bell" size={size} color={color} />
);

export const ChevronRight = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="chevron-right" size={size} color={color} />
);

export const ChevronDown = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="chevron-down" size={size} color={color} />
);

export const Clock = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="clock" size={size} color={color} />
);

export const Info = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="info" size={size} color={color} />
);

export const AlertTriangle = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="alert-triangle" size={size} color={color} />
);

export const X = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="x" size={size} color={color} />
);

export const WifiOff = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="wifi-off" size={size} color={color} />
);

export const Camera = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="camera" size={size} color={color} />
);

export const TrendingUp = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="trending-up" size={size} color={color} />
);

export const TrendingDown = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="trending-down" size={size} color={color} />
);

export const CheckCircle = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="check-circle" size={size} color={color} />
);

export const XCircle = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="x-circle" size={size} color={color} />
);

export const Send = ({ size = 24, color = '#000' }: IconProps) => (
  <Feather name="send" size={size} color={color} />
);
