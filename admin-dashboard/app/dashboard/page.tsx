'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatCard from '@/components/StatCard';
import GlassCard from '@/components/GlassCard';
import { API_ENDPOINTS } from '@/lib/api-config';
import type { DashboardStats } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(API_ENDPOINTS.ADMIN_WAREHOUSES, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        // Calculate stats from warehouses
        const warehouses = data.data || [];
        setStats({
          totalWarehouses: warehouses.length,
          warehousesAwaitingGenesis: warehouses.filter((w: any) => w.status === 'GENESIS_PENDING').length,
          activeWarehouses: warehouses.filter((w: any) => w.status === 'ACTIVE').length,
          suspendedWarehouses: warehouses.filter((w: any) => w.status === 'SUSPENDED').length,
          ownersOnboarded: warehouses.filter((w: any) => w.ownerId).length,
          attendantsOnboarded: 0, // Would need separate endpoint
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-agricultural-beige via-agricultural-sand to-agricultural-clay flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🌾</div>
          <p className="text-agricultural-earth">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-agricultural-beige via-agricultural-sand to-agricultural-clay">
      {/* Header */}
      <header className="glass-panel border-b border-white/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🌾</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Trustless Granary</h1>
              <p className="text-sm text-agricultural-earth">Platform Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-white/50 hover:bg-white/70 text-agricultural-earth font-medium transition-all"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">System Overview</h2>
          <p className="text-agricultural-earth">Platform health and activity monitoring</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Warehouses"
            value={stats?.totalWarehouses || 0}
            icon="🏢"
            subtitle="All warehouses in system"
          />
          <StatCard
            title="Awaiting Genesis"
            value={stats?.warehousesAwaitingGenesis || 0}
            icon="⏳"
            subtitle="Pending activation"
            className="border-2 border-amber-200"
          />
          <StatCard
            title="Active Warehouses"
            value={stats?.activeWarehouses || 0}
            icon="✅"
            subtitle="Operational"
          />
          <StatCard
            title="Suspended"
            value={stats?.suspendedWarehouses || 0}
            icon="🚫"
            subtitle="Currently inactive"
          />
          <StatCard
            title="Owners Onboarded"
            value={stats?.ownersOnboarded || 0}
            icon="👤"
            subtitle="Total owners"
          />
          <StatCard
            title="Attendants"
            value={stats?.attendantsOnboarded || 0}
            icon="👥"
            subtitle="Total attendants"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dashboard/warehouses">
              <GlassCard className="p-6 hover:scale-105 transition-transform cursor-pointer">
                <div className="text-3xl mb-3">🏢</div>
                <h4 className="font-semibold text-gray-900 mb-1">Manage Warehouses</h4>
                <p className="text-sm text-agricultural-earth">Create & configure</p>
              </GlassCard>
            </Link>

            <Link href="/dashboard/users">
              <GlassCard className="p-6 hover:scale-105 transition-transform cursor-pointer">
                <div className="text-3xl mb-3">👥</div>
                <h4 className="font-semibold text-gray-900 mb-1">Manage Users</h4>
                <p className="text-sm text-agricultural-earth">Onboard owners & attendants</p>
              </GlassCard>
            </Link>

            <Link href="/dashboard/genesis">
              <GlassCard className="p-6 hover:scale-105 transition-transform cursor-pointer">
                <div className="text-3xl mb-3">🌱</div>
                <h4 className="font-semibold text-gray-900 mb-1">Genesis Setup</h4>
                <p className="text-sm text-agricultural-earth">Record initial inventory</p>
              </GlassCard>
            </Link>

            <Link href="/dashboard/audit">
              <GlassCard className="p-6 hover:scale-105 transition-transform cursor-pointer">
                <div className="text-3xl mb-3">📋</div>
                <h4 className="font-semibold text-gray-900 mb-1">Audit Trail</h4>
                <p className="text-sm text-agricultural-earth">System activity log</p>
              </GlassCard>
            </Link>
          </div>
        </div>

        {/* Recent Activity (Placeholder) */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recent System Activity</h3>
          <div className="text-center py-8 text-agricultural-earth">
            <p>Activity log integration coming soon</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
