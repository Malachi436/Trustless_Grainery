'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/lib/api-config';
import type { DashboardStats } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    if (!token) {
      router.push('/login');
      return;
    }
    if (user) {
      setAdminUser(JSON.parse(user));
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
        const warehouses = data.data || [];
        setStats({
          totalWarehouses: warehouses.length,
          warehousesAwaitingGenesis: warehouses.filter((w: any) => w.status === 'GENESIS_PENDING').length,
          activeWarehouses: warehouses.filter((w: any) => w.status === 'ACTIVE').length,
          suspendedWarehouses: warehouses.filter((w: any) => w.status === 'SUSPENDED').length,
          ownersOnboarded: warehouses.filter((w: any) => w.ownerId).length,
          attendantsOnboarded: 0,
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
      <div 
        className="min-h-screen flex items-center justify-center" 
        style={{ background: 'linear-gradient(135deg, #fafaf8 0%, #efece6 100%)' }}
      >
        <div className="text-center">
          <div 
            className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" 
            style={{ 
              borderColor: '#d9d9d5', 
              borderTopColor: '#8fcd84' 
            }} 
          />
          <p style={{ color: '#6b6f69', fontSize: '15px' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen" 
      style={{ background: 'linear-gradient(135deg, #fafaf8 0%, #efece6 100%)' }}
    >
      {/* Header */}
      <header 
        className="border-b sticky top-0 z-50"
        style={{ 
          background: 'rgba(239, 236, 230, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'rgba(138, 156, 123, 0.2)'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md" 
              style={{ background: 'linear-gradient(135deg, #a7d9a0 0%, #8fcd84 100%)' }}
            >
              <svg 
                className="w-7 h-7" 
                style={{ color: '#1e1e1e' }} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.8} 
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-medium" style={{ color: '#1e1e1e', letterSpacing: '-0.01em' }}>
                Trustless Granary
              </h1>
              <p className="text-xs" style={{ color: '#6b6f69' }}>
                Platform Admin
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {adminUser && (
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium" style={{ color: '#1e1e1e' }}>{adminUser.name}</p>
                <p className="text-xs" style={{ color: '#6b6f69' }}>{adminUser.phone}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
              style={{ 
                background: 'rgba(200, 185, 166, 0.4)',
                color: '#3a3f38',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(200, 185, 166, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(200, 185, 166, 0.4)';
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Page Title */}
        <div className="mb-10">
          <h2 
            className="text-3xl font-medium mb-2" 
            style={{ color: '#1e1e1e', letterSpacing: '-0.02em' }}
          >
            System Overview
          </h2>
          <p style={{ color: '#6b6f69', fontSize: '15px' }}>
            Platform health and activity monitoring
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <StatCard
            title="Total Warehouses"
            value={stats?.totalWarehouses || 0}
            subtitle="All warehouses in system"
          />
          <StatCard
            title="Awaiting Genesis"
            value={stats?.warehousesAwaitingGenesis || 0}
            subtitle="Pending activation"
            highlight="warning"
          />
          <StatCard
            title="Active Warehouses"
            value={stats?.activeWarehouses || 0}
            subtitle="Operational"
            highlight="success"
          />
          <StatCard
            title="Suspended"
            value={stats?.suspendedWarehouses || 0}
            subtitle="Currently inactive"
            highlight="danger"
          />
          <StatCard
            title="Owners Onboarded"
            value={stats?.ownersOnboarded || 0}
            subtitle="Total owners"
          />
          <StatCard
            title="Attendants"
            value={stats?.attendantsOnboarded || 0}
            subtitle="Total attendants"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-10">
          <h3 
            className="text-xl font-medium mb-6" 
            style={{ color: '#1e1e1e', letterSpacing: '-0.01em' }}
          >
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <ActionCard 
              href="/dashboard/warehouses"
              title="Manage Warehouses"
              subtitle="Create & configure"
              icon={<WarehouseIcon />}
            />
            <ActionCard 
              href="/dashboard/users"
              title="Manage Users"
              subtitle="Onboard owners & attendants"
              icon={<UsersIcon />}
            />
            <ActionCard 
              href="/dashboard/genesis"
              title="Genesis Setup"
              subtitle="Record initial inventory"
              icon={<GenesisIcon />}
            />
            <ActionCard 
              href="/dashboard/audit"
              title="Audit Trail"
              subtitle="System activity log"
              icon={<AuditIcon />}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div 
          className="rounded-2xl p-8 shadow-lg"
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(138, 156, 123, 0.2)'
          }}
        >
          <h3 
            className="text-xl font-medium mb-6" 
            style={{ color: '#1e1e1e', letterSpacing: '-0.01em' }}
          >
            Recent System Activity
          </h3>
          <div className="text-center py-12" style={{ color: '#6b6f69' }}>
            <svg 
              className="w-16 h-16 mx-auto mb-4 opacity-40" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
              />
            </svg>
            <p style={{ fontSize: '15px' }}>Activity log integration coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, subtitle, highlight }: { 
  title: string; 
  value: number; 
  subtitle: string;
  highlight?: 'success' | 'warning' | 'danger';
}) {
  const getHighlightStyles = () => {
    if (highlight === 'success') {
      return {
        background: 'linear-gradient(135deg, rgba(122, 184, 111, 0.12), rgba(255, 255, 255, 0.75))',
        borderColor: 'rgba(122, 184, 111, 0.3)'
      };
    }
    if (highlight === 'warning') {
      return {
        background: 'linear-gradient(135deg, rgba(212, 165, 116, 0.12), rgba(255, 255, 255, 0.75))',
        borderColor: 'rgba(212, 165, 116, 0.3)'
      };
    }
    if (highlight === 'danger') {
      return {
        background: 'linear-gradient(135deg, rgba(184, 92, 92, 0.12), rgba(255, 255, 255, 0.75))',
        borderColor: 'rgba(184, 92, 92, 0.3)'
      };
    }
    return {
      background: 'rgba(255, 255, 255, 0.75)',
      borderColor: 'rgba(138, 156, 123, 0.2)'
    };
  };

  const styles = getHighlightStyles();

  return (
    <div 
      className="rounded-2xl p-6 shadow-lg transition-all duration-200"
      style={{
        ...styles,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${styles.borderColor}`
      }}
    >
      <p className="text-sm font-medium mb-3" style={{ color: '#3a3f38', letterSpacing: '0.01em' }}>
        {title}
      </p>
      <p 
        className="text-4xl font-medium mb-2" 
        style={{ color: '#1e1e1e', letterSpacing: '-0.02em' }}
      >
        {value}
      </p>
      <p className="text-xs" style={{ color: '#6b6f69' }}>
        {subtitle}
      </p>
    </div>
  );
}

// Action Card Component
function ActionCard({ href, title, subtitle, icon }: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link href={href}>
      <div 
        className="rounded-2xl p-6 transition-all duration-200 cursor-pointer shadow-lg"
        style={{
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(138, 156, 123, 0.2)',
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: isHovered 
            ? '0 12px 24px rgba(143, 205, 132, 0.15)' 
            : '0 4px 12px rgba(0, 0, 0, 0.08)'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="mb-4" style={{ color: '#8fcd84' }}>
          {icon}
        </div>
        <h4 
          className="font-medium mb-1.5" 
          style={{ color: '#1e1e1e', fontSize: '16px', letterSpacing: '-0.01em' }}
        >
          {title}
        </h4>
        <p className="text-sm" style={{ color: '#6b6f69' }}>
          {subtitle}
        </p>
      </div>
    </Link>
  );
}

// Icon Components
function WarehouseIcon() {
  return (
    <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" 
      />
    </svg>
  );
}

function GenesisIcon() {
  return (
    <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
      />
    </svg>
  );
}

function AuditIcon() {
  return (
    <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" 
      />
    </svg>
  );
}
