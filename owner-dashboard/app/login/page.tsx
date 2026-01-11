'use client';

import React, { useState } from 'react';
import { API_ENDPOINTS } from '@/lib/api-config';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Clear any stale tokens before logging in
    localStorage.removeItem('ownerToken');
    localStorage.removeItem('ownerData');

    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Verify user is an owner
      if (data.data.user.role !== 'OWNER') {
        throw new Error('Access denied. This portal is for warehouse owners only.');
      }

      // Store token and user data
      localStorage.setItem('ownerToken', data.data.accessToken);
      localStorage.setItem('ownerData', JSON.stringify(data.data.user));

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(138, 156, 123, 0.2)'
        }}
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Trustless Granary" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="text-gray-600 mt-2">Warehouse Analytics & Oversight</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="2348012345678"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
              PIN
            </label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your 4-digit PIN"
              maxLength={4}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Trustless Granary System</p>
          <p className="mt-1">Warehouse Owners Only</p>
        </div>
      </div>
    </div>
  );
}
