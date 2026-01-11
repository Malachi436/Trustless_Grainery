'use client';

import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '@/lib/api-config';
import type { ExecutiveSnapshot } from '@/lib/types';

export default function OwnerDashboard() {
  const [snapshot, setSnapshot] = useState<ExecutiveSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSnapshot();
  }, []);

  const fetchSnapshot = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ownerToken');
      
      if (!token) {
        window.location.href = '/login';
        return;
      }

      // Debug: log token prefix to verify it exists
      console.log('Token found, first 20 chars:', token.substring(0, 20));
      console.log('API endpoint:', API_ENDPOINTS.ANALYTICS_SNAPSHOT);

      const response = await fetch(API_ENDPOINTS.ANALYTICS_SNAPSHOT, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch snapshot (${response.status}): ${errData.error || response.statusText}`);
      }

      const data = await response.json();
      setSnapshot(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('ownerToken');
    localStorage.removeItem('ownerData');
    window.location.href = '/login';
  };

  if (error) {
    const isAuthError = error.includes('401') || error.includes('Invalid or expired token');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center max-w-md">
          <p className="text-red-600 font-medium mb-2">Error: {error}</p>
          {isAuthError && (
            <p className="text-sm text-gray-600 mb-4">Your session has expired. Please log in again.</p>
          )}
          <div className="space-y-2">
            {!isAuthError && (
              <button
                onClick={fetchSnapshot}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Retry
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              {isAuthError ? 'Login Again' : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Analytics & Oversight</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchSnapshot}
                className="px-4 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                🔄 Refresh
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Executive Snapshot Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Stock */}
          <div 
            className="rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-shadow"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}
            onClick={() => window.location.href = '/dashboard/stock'}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <span className="text-2xl">📦</span>
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Total Stock</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {snapshot?.totalStockBags.toLocaleString() || 0}
              <span className="text-lg text-gray-500 ml-2">bags</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Own Farm:</span>
                <span className="font-medium">{snapshot?.stockBySource.ownFarm || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>SME:</span>
                <span className="font-medium">{snapshot?.stockBySource.sme || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Small Farmer:</span>
                <span className="font-medium">{snapshot?.stockBySource.smallFarmer || 0}</span>
              </div>
            </div>
          </div>

          {/* Active Batches */}
          <div 
            className="rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-shadow"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}
            onClick={() => window.location.href = '/dashboard/batches'}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <span className="text-2xl">📊</span>
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Active Batches</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {snapshot?.activeBatches || 0}
            </div>
            <p className="text-sm text-gray-600">
              Batches with remaining inventory
            </p>
          </div>

          {/* Pending Requests */}
          <div 
            className="rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-shadow"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(245, 158, 11, 0.2)'
            }}
            onClick={() => window.location.href = '/dashboard/approvals'}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <span className="text-2xl">⏳</span>
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Pending Approval</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {snapshot?.pendingRequests || 0}
            </div>
            <p className="text-sm text-gray-600">
              Requests awaiting your approval
            </p>
          </div>

          {/* Outstanding Credit */}
          <div 
            className="rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-shadow"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
            onClick={() => window.location.href = '/dashboard/credit'}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <span className="text-2xl">💳</span>
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Outstanding Credit</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              GH₵{snapshot?.outstandingCreditTotal.toLocaleString() || 0}
            </div>
            <p className="text-sm text-gray-600">
              Total pending credit payments
            </p>
          </div>

          {/* Tools Assigned */}
          <div 
            className="rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-shadow"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(139, 92, 246, 0.2)'
            }}
            onClick={() => window.location.href = '/dashboard/tools'}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <span className="text-2xl">🔧</span>
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Tools Assigned</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {snapshot?.toolsAssigned || 0}
            </div>
            <p className="text-sm text-gray-600">
              Currently with attendants
            </p>
          </div>

          {/* Transactions */}
          <div 
            className="rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-shadow"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}
            onClick={() => window.location.href = '/dashboard/transactions'}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <span className="text-2xl">📋</span>
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Transaction History</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              View All
            </div>
            <p className="text-sm text-gray-600">
              Complete ledger of all transactions
            </p>
          </div>

          {/* Expected Inventory (v3: Outgrower) */}
          <div 
            className="rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-shadow"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}
            onClick={() => window.location.href = '/dashboard/expected-inventory'}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <span className="text-2xl">🌾</span>
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Expected Inventory</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              Track Outgrowth
            </div>
            <p className="text-sm text-gray-600">
              Monitor field agent services and recovery
            </p>
          </div>

          {/* Recovery Analytics (v3: Outgrower) */}
          <div 
            className="rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-shadow"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(79, 172, 254, 0.2)'
            }}
            onClick={() => window.location.href = '/dashboard/recovery-analytics'}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-cyan-100 rounded-xl">
                <span className="text-2xl">📊</span>
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Recovery Analytics</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              Recovery Progress
            </div>
            <p className="text-sm text-gray-600">
              Analyze recovery status and completion rates
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div 
          className="rounded-2xl p-6 mb-8"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(138, 156, 123, 0.2)'
          }}
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => window.location.href = '/dashboard/approvals'}
              className="p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors text-left"
            >
              <div className="text-2xl mb-2">✅</div>
              <div className="text-sm font-medium text-gray-900">Approvals</div>
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/transactions'}
              className="p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors text-left"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium text-gray-900">Transactions</div>
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/batches'}
              className="p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors text-left"
            >
              <div className="text-2xl mb-2">📦</div>
              <div className="text-sm font-medium text-gray-900">Batches</div>
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/attendants'}
              className="p-4 rounded-xl bg-yellow-50 hover:bg-yellow-100 transition-colors text-left"
            >
              <div className="text-2xl mb-2">👥</div>
              <div className="text-sm font-medium text-gray-900">Attendants</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
