'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import { API_ENDPOINTS } from '@/lib/api-config';
import type { User, Warehouse, UserRole } from '@/lib/types';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    phone: '',
    pin: '',
    role: 'OWNER' as UserRole,
    warehouseId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      // Fetch users and warehouses in parallel
      const [usersRes, warehousesRes] = await Promise.all([
        fetch(API_ENDPOINTS.ADMIN_USERS, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(API_ENDPOINTS.ADMIN_WAREHOUSES, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      const [usersData, warehousesData] = await Promise.all([
        usersRes.json(),
        warehousesRes.json(),
      ]);

      if (usersData.success) setUsers(usersData.data || []);
      if (warehousesData.success) setWarehouses(warehousesData.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(API_ENDPOINTS.ADMIN_USERS, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newUser.name,
          phone: newUser.phone,
          pin: newUser.pin,
          role: newUser.role,
          warehouseId: newUser.warehouseId || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewUser({
          name: '',
          phone: '',
          pin: '',
          role: 'OWNER',
          warehouseId: '',
        });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'PLATFORM_ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'OWNER': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ATTENDANT': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getWarehouseName = (warehouseId?: string) => {
    if (!warehouseId) return 'Not assigned';
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse?.name || 'Unknown';
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
            <div className="text-2xl">👥</div>
            <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-agricultural-green hover:bg-agricultural-green/90 text-white font-semibold transition-all shadow-lg"
          >
            + Create User
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-agricultural-earth">Loading users...</p>
          </div>
        ) : (
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-agricultural-clay">
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Phone</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Role</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Warehouse</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Created</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-agricultural-clay/50 hover:bg-white/20">
                      <td className="p-4 font-medium text-gray-900">{user.name}</td>
                      <td className="p-4 text-agricultural-earth">{user.phone}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getRoleBadgeColor(user.role)}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-700">{getWarehouseName(user.warehouseId)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                          user.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-agricultural-earth">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <button className="text-sm text-agricultural-green hover:text-agricultural-green/80 font-medium">
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {users.length === 0 && (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">👥</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Users Yet</h3>
                <p className="text-agricultural-earth mb-6">Create your first user to get started</p>
              </div>
            )}
          </GlassCard>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <GlassCard className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-agricultural-clay bg-white/50 focus:outline-none focus:ring-2 focus:ring-agricultural-green"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-agricultural-clay bg-white/50 focus:outline-none focus:ring-2 focus:ring-agricultural-green"
                  placeholder="0201234567"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PIN (4 digits)
                </label>
                <input
                  type="password"
                  value={newUser.pin}
                  onChange={(e) => setNewUser({ ...newUser, pin: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-agricultural-clay bg-white/50 focus:outline-none focus:ring-2 focus:ring-agricultural-green"
                  placeholder="****"
                  maxLength={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  className="w-full px-4 py-3 rounded-xl border border-agricultural-clay bg-white/50 focus:outline-none focus:ring-2 focus:ring-agricultural-green"
                >
                  <option value="OWNER">Owner</option>
                  <option value="ATTENDANT">Attendant</option>
                </select>
                <p className="text-xs text-agricultural-earth mt-1">
                  Role cannot be changed after creation
                </p>
              </div>

              {newUser.role !== 'PLATFORM_ADMIN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Warehouse (Optional)
                  </label>
                  <select
                    value={newUser.warehouseId}
                    onChange={(e) => setNewUser({ ...newUser, warehouseId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-agricultural-clay bg-white/50 focus:outline-none focus:ring-2 focus:ring-agricultural-green"
                  >
                    <option value="">Select warehouse...</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} - {warehouse.location}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
