'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_ENDPOINTS } from '@/lib/api-config';

interface Warehouse {
  id: string;
  name: string;
  location: string;
  status: 'SETUP' | 'GENESIS_PENDING' | 'ACTIVE' | 'SUSPENDED';
  ownerId: string | null;
  ownerName?: string;
  createdAt: string;
}

export default function WarehousesPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({ 
    name: '', 
    location: '',
    ownerName: '',
    ownerPhone: '',
    ownerPin: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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
    if (!newWarehouse.name || !newWarehouse.location || !newWarehouse.ownerName || !newWarehouse.ownerPhone || !newWarehouse.ownerPin) return;

    setIsSubmitting(true);
    setError('');
    
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
      
      if (!response.ok) {
        setError(data.error || data.details?.[0]?.msg || 'Failed to create warehouse');
        return;
      }
      
      if (data.success) {
        setShowCreateModal(false);
        setNewWarehouse({ name: '', location: '', ownerName: '', ownerPhone: '', ownerPin: '' });
        fetchWarehouses();
      }
    } catch (error) {
      console.error('Failed to create warehouse:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-success/20 text-success';
      case 'GENESIS_PENDING': return 'bg-warning/20 text-warning';
      case 'SUSPENDED': return 'bg-danger/20 text-danger';
      default: return 'bg-stone/20 text-text-muted';
    }
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #fafaf8 0%, #efece6 100%)', minHeight: '100vh' }}>
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
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg transition-colors"
              style={{ background: 'rgba(200, 185, 166, 0.3)' }}
            >
              <svg className="w-5 h-5" style={{ color: '#3a3f38' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-medium" style={{ color: '#1e1e1e' }}>Warehouse Management</h1>
              <p className="text-xs" style={{ color: '#6b6f69' }}>Create and manage warehouses</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg font-medium transition-all"
            style={{ 
              background: 'linear-gradient(135deg, #a7d9a0 0%, #8fcd84 100%)',
              color: '#1e1e1e'
            }}
          >
            + New Warehouse
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" 
                 style={{ borderColor: '#d9d9d5', borderTopColor: '#8fcd84' }} />
            <p style={{ color: '#6b6f69' }}>Loading warehouses...</p>
          </div>
        ) : warehouses.length === 0 ? (
          <div 
            className="rounded-2xl p-12 text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(138, 156, 123, 0.2)'
            }}
          >
            <svg className="w-16 h-16 mx-auto mb-4 opacity-40" style={{ color: '#6b6f69' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-lg font-medium mb-2" style={{ color: '#1e1e1e' }}>No warehouses yet</p>
            <p className="mb-6" style={{ color: '#6b6f69' }}>Create your first warehouse to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 rounded-lg font-medium"
              style={{ 
                background: 'linear-gradient(135deg, #a7d9a0 0%, #8fcd84 100%)',
                color: '#1e1e1e'
              }}
            >
              Create Warehouse
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {warehouses.map((warehouse) => (
              <div
                key={warehouse.id}
                className="rounded-2xl p-6 transition-all hover:scale-[1.02] cursor-pointer"
                style={{
                  background: 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(138, 156, 123, 0.2)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" 
                         style={{ background: 'linear-gradient(135deg, #a7d9a0 0%, #8fcd84 100%)' }}>
                      <svg className="w-6 h-6" style={{ color: '#1e1e1e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(warehouse.status)}`}>
                    {warehouse.status.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="text-lg font-medium mb-1" style={{ color: '#1e1e1e' }}>{warehouse.name}</h3>
                <p className="text-sm mb-4" style={{ color: '#6b6f69' }}>{warehouse.location}</p>

                <div className="pt-4 border-t" style={{ borderColor: 'rgba(138, 156, 123, 0.2)' }}>
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#6b6f69' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(warehouse.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-6 z-50"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-8"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(138, 156, 123, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-medium mb-6" style={{ color: '#1e1e1e' }}>Create New Warehouse</h2>

            {error && (
              <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(184, 92, 92, 0.1)', border: '1px solid rgba(184, 92, 92, 0.3)' }}>
                <p className="text-sm" style={{ color: '#b85c5c' }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleCreateWarehouse} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#3a3f38' }}>
                  Warehouse Name
                </label>
                <input
                  type="text"
                  value={newWarehouse.name}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg transition-all"
                  style={{ 
                    border: '1px solid rgba(138, 156, 123, 0.3)',
                    background: 'rgba(255, 255, 255, 0.6)',
                    color: '#1e1e1e'
                  }}
                  placeholder="e.g., Main Storage Facility"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#3a3f38' }}>
                  Location
                </label>
                <input
                  type="text"
                  value={newWarehouse.location}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, location: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg transition-all"
                  style={{ 
                    border: '1px solid rgba(138, 156, 123, 0.3)',
                    background: 'rgba(255, 255, 255, 0.6)',
                    color: '#1e1e1e'
                  }}
                  placeholder="e.g., Accra, Ghana"
                  required
                />
              </div>

              <div className="pt-4 border-t" style={{ borderColor: 'rgba(138, 156, 123, 0.2)' }}>
                <h3 className="text-sm font-medium mb-4" style={{ color: '#3a3f38' }}>Owner Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#3a3f38' }}>
                      Owner Name
                    </label>
                    <input
                      type="text"
                      value={newWarehouse.ownerName}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, ownerName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg transition-all"
                      style={{ 
                        border: '1px solid rgba(138, 156, 123, 0.3)',
                        background: 'rgba(255, 255, 255, 0.6)',
                        color: '#1e1e1e'
                      }}
                      placeholder="Full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#3a3f38' }}>
                      Owner Phone
                    </label>
                    <input
                      type="tel"
                      value={newWarehouse.ownerPhone}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, ownerPhone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg transition-all"
                      style={{ 
                        border: '1px solid rgba(138, 156, 123, 0.3)',
                        background: 'rgba(255, 255, 255, 0.6)',
                        color: '#1e1e1e'
                      }}
                      placeholder="e.g., +233123456789"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#3a3f38' }}>
                      Owner PIN (4 digits)
                    </label>
                    <input
                      type="text"
                      value={newWarehouse.ownerPin}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, ownerPin: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg transition-all"
                      style={{ 
                        border: '1px solid rgba(138, 156, 123, 0.3)',
                        background: 'rgba(255, 255, 255, 0.6)',
                        color: '#1e1e1e'
                      }}
                      placeholder="4-digit PIN"
                      maxLength={4}
                      pattern="[0-9]{4}"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-lg font-medium transition-all"
                  style={{ 
                    background: 'rgba(200, 185, 166, 0.4)',
                    color: '#3a3f38'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50"
                  style={{ 
                    background: 'linear-gradient(135deg, #a7d9a0 0%, #8fcd84 100%)',
                    color: '#1e1e1e'
                  }}
                >
                  {isSubmitting ? 'Creating...' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
