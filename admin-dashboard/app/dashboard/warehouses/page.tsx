'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import { API_ENDPOINTS } from '@/lib/api-config';
import type { Warehouse } from '@/lib/types';

export default function WarehousesPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({ name: '', location: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(API_ENDPOINTS.ADMIN_WAREHOUSES, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setWarehouses(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(API_ENDPOINTS.ADMIN_WAREHOUSES, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newWarehouse),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewWarehouse({ name: '', location: '' });
        fetchWarehouses();
      }
    } catch (error) {
      console.error('Failed to create warehouse:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-200';
      case 'GENESIS_PENDING': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'SUSPENDED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-agricultural-beige via-agricultural-sand to-agricultural-clay">
      {/* Header */}
      <header className="glass-panel border-b border-white/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-agricultural-earth hover:text-gray-900">
              ← Back
            </Link>
            <div className="text-2xl">🏢</div>
            <h1 className="text-xl font-bold text-gray-900">Warehouse Management</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-agricultural-green hover:bg-agricultural-green/90 text-white font-semibold transition-all shadow-lg"
          >
            + Create Warehouse
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🏢</div>
            <p className="text-agricultural-earth">Loading warehouses...</p>
          </div>
        ) : warehouses.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <div className="text-5xl mb-4">🏢</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Warehouses Yet</h3>
            <p className="text-agricultural-earth mb-6">Create your first warehouse to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-xl bg-agricultural-green hover:bg-agricultural-green/90 text-white font-semibold transition-all shadow-lg"
            >
              Create First Warehouse
            </button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {warehouses.map((warehouse) => (
              <GlassCard key={warehouse.id} className="p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{warehouse.name}</h3>
                    <p className="text-sm text-agricultural-earth">{warehouse.location}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(warehouse.status)}`}>
                    {warehouse.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-agricultural-earth">Owner:</span>
                    <span className="font-medium text-gray-900">
                      {warehouse.ownerName || 'Not assigned'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-agricultural-earth">Attendants:</span>
                    <span className="font-medium text-gray-900">
                      {warehouse.attendants?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-agricultural-earth">Created:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(warehouse.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 rounded-lg bg-agricultural-green-light text-agricultural-green font-medium hover:bg-agricultural-green/10 transition-all">
                    View Details
                  </button>
                  {warehouse.status !== 'SUSPENDED' && (
                    <button className="px-4 py-2 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-all">
                      Suspend
                    </button>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Create Warehouse Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <GlassCard className="w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Warehouse</h2>
            <form onSubmit={handleCreateWarehouse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warehouse Name
                </label>
                <input
                  type="text"
                  value={newWarehouse.name}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-agricultural-clay bg-white/50 focus:outline-none focus:ring-2 focus:ring-agricultural-green focus:border-transparent"
                  placeholder="Main Warehouse"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={newWarehouse.location}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, location: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-agricultural-clay bg-white/50 focus:outline-none focus:ring-2 focus:ring-agricultural-green focus:border-transparent"
                  placeholder="Accra, Ghana"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/50 hover:bg-white/70 text-gray-700 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 rounded-xl bg-agricultural-green hover:bg-agricultural-green/90 text-white font-semibold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
