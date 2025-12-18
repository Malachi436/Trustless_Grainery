'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_ENDPOINTS } from '@/lib/api-config';

interface User {
  id: string;
  name: string;
  phone: string;
  role: 'OWNER' | 'ATTENDANT';
  warehouseId: string | null;
  warehouseName?: string;
  active: boolean;
  createdAt: string;
}

interface Warehouse {
  id: string;
  name: string;
}

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
    role: 'OWNER' as 'OWNER' | 'ATTENDANT',
    warehouseId: ''
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
      
      // Fetch users
      const usersResponse = await fetch(API_ENDPOINTS.ADMIN_USERS, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const usersData = await usersResponse.json();
      if (usersData.success) {
        setUsers(usersData.data || []);
      }

      // Fetch warehouses
      const whResponse = await fetch(API_ENDPOINTS.ADMIN_WAREHOUSES, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const whData = await whResponse.json();
      if (whData.success) {
        setWarehouses(whData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.phone || !newUser.pin) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(API_ENDPOINTS.ADMIN_USERS, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewUser({ name: '', phone: '', pin: '', role: 'OWNER', warehouseId: '' });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsSubmitting(false);
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
              <h1 className="text-lg font-medium" style={{ color: '#1e1e1e' }}>User Management</h1>
              <p className="text-xs" style={{ color: '#6b6f69' }}>Onboard owners and attendants</p>
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
            + New User
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" 
                 style={{ borderColor: '#d9d9d5', borderTopColor: '#8fcd84' }} />
            <p style={{ color: '#6b6f69' }}>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div 
            className="rounded-2xl p-12 text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(138, 156, 123, 0.2)'
            }}
          >
            <svg className="w-16 h-16 mx-auto mb-4 opacity-40" style={{ color: '#6b6f69' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-lg font-medium mb-2" style={{ color: '#1e1e1e' }}>No users yet</p>
            <p className="mb-6" style={{ color: '#6b6f69' }}>Create your first user to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 rounded-lg font-medium"
              style={{ 
                background: 'linear-gradient(135deg, #a7d9a0 0%, #8fcd84 100%)',
                color: '#1e1e1e'
              }}
            >
              Create User
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="rounded-xl p-5 transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(138, 156, 123, 0.2)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" 
                         style={{ background: user.role === 'OWNER' ? 'linear-gradient(135deg, #a7d9a0 0%, #8fcd84 100%)' : 'rgba(138, 156, 123, 0.2)' }}>
                      <svg className="w-6 h-6" style={{ color: user.role === 'OWNER' ? '#1e1e1e' : '#6b6f69' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium" style={{ color: '#1e1e1e' }}>{user.name}</h3>
                      <p className="text-sm" style={{ color: '#6b6f69' }}>{user.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        user.role === 'OWNER' ? 'bg-primary/20' : 'bg-stone/20'
                      }`} style={{ color: user.role === 'OWNER' ? '#7ab86f' : '#6b6f69' }}>
                        {user.role}
                      </span>
                      {user.warehouseName && (
                        <p className="text-xs mt-1" style={{ color: '#6b6f69' }}>{user.warehouseName}</p>
                      )}
                    </div>
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
            className="w-full max-w-md rounded-2xl p-8 max-h-[90vh] overflow-y-auto"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(138, 156, 123, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-medium mb-6" style={{ color: '#1e1e1e' }}>Create New User</h2>

            <form onSubmit={handleCreateUser} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#3a3f38' }}>Full Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg"
                  style={{ border: '1px solid rgba(138, 156, 123, 0.3)', background: 'rgba(255, 255, 255, 0.6)', color: '#1e1e1e' }}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#3a3f38' }}>Phone Number</label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg"
                  style={{ border: '1px solid rgba(138, 156, 123, 0.3)', background: 'rgba(255, 255, 255, 0.6)', color: '#1e1e1e' }}
                  placeholder="0200000000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#3a3f38' }}>PIN (4 digits)</label>
                <input
                  type="password"
                  value={newUser.pin}
                  onChange={(e) => setNewUser({ ...newUser, pin: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg"
                  style={{ border: '1px solid rgba(138, 156, 123, 0.3)', background: 'rgba(255, 255, 255, 0.6)', color: '#1e1e1e' }}
                  placeholder="****"
                  maxLength={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#3a3f38' }}>Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'OWNER' | 'ATTENDANT' })}
                  className="w-full px-4 py-2.5 rounded-lg"
                  style={{ border: '1px solid rgba(138, 156, 123, 0.3)', background: 'rgba(255, 255, 255, 0.6)', color: '#1e1e1e' }}
                >
                  <option value="OWNER">Owner</option>
                  <option value="ATTENDANT">Attendant</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#3a3f38' }}>Assign to Warehouse</label>
                <select
                  value={newUser.warehouseId}
                  onChange={(e) => setNewUser({ ...newUser, warehouseId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg"
                  style={{ border: '1px solid rgba(138, 156, 123, 0.3)', background: 'rgba(255, 255, 255, 0.6)', color: '#1e1e1e' }}
                  required
                >
                  <option value="">Select warehouse...</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-lg font-medium"
                  style={{ background: 'rgba(200, 185, 166, 0.4)', color: '#3a3f38' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-lg font-medium disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #a7d9a0 0%, #8fcd84 100%)', color: '#1e1e1e' }}
                >
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
