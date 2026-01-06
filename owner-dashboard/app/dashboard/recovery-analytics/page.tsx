'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/lib/api-config';

interface RecoveryAnalytics {
  total_recovery_records: number;
  total_expected: number;
  total_received: number;
  completed_count: number;
  partial_count: number;
  pending_count: number;
  harvested_count: number;
  by_farmer?: Array<{
    farmer_name: string;
    expected: number;
    received: number;
    status: string;
  }>;
}

export default function RecoveryAnalyticsPage() {
  const [analytics, setAnalytics] = useState<RecoveryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecoveryAnalytics();
  }, []);

  const fetchRecoveryAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ownerToken');
      
      if (!token) {
        window.location.href = '/login';
        return;
      }

      // Fetch analytics snapshot which includes recovery data
      const response = await fetch(`${API_ENDPOINTS.ANALYTICS_SNAPSHOT}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recovery analytics');
      }

      const data = await response.json();
      setAnalytics(data.data?.recovery_summary || {
        total_recovery_records: 0,
        total_expected: 0,
        total_received: 0,
        completed_count: 0,
        partial_count: 0,
        pending_count: 0,
        harvested_count: 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const recoveryRate = analytics?.total_expected 
    ? Math.round((analytics.total_received / analytics.total_expected) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recovery analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <p className="text-red-600 font-semibold">Error: {error}</p>
          <button
            onClick={fetchRecoveryAnalytics}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Recovery Analytics</h1>
            <p className="text-gray-600">Monitor outgrower recovery progress and completion rates</p>
          </div>
          <Link href="/dashboard">
            <button className="px-6 py-2 bg-white text-blue-600 rounded-lg shadow hover:shadow-lg transition">
              ← Back
            </button>
          </Link>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
            <p className="text-gray-600 text-sm font-semibold mb-2">Total Records</p>
            <p className="text-3xl font-bold text-blue-600">{analytics?.total_recovery_records || 0}</p>
            <p className="text-gray-500 text-xs mt-2">service records</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
            <p className="text-gray-600 text-sm font-semibold mb-2">Recovery Rate</p>
            <p className="text-3xl font-bold text-green-600">{recoveryRate}%</p>
            <p className="text-gray-500 text-xs mt-2">
              {analytics?.total_received || 0} / {analytics?.total_expected || 0} bags
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-emerald-600">
            <p className="text-gray-600 text-sm font-semibold mb-2">Completed</p>
            <p className="text-3xl font-bold text-emerald-600">{analytics?.completed_count || 0}</p>
            <p className="text-gray-500 text-xs mt-2">100% received</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-600">
            <p className="text-gray-600 text-sm font-semibold mb-2">Outstanding</p>
            <p className="text-3xl font-bold text-amber-600">
              {(analytics?.total_expected || 0) - (analytics?.total_received || 0)}
            </p>
            <p className="text-gray-500 text-xs mt-2">bags remaining</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Status Distribution</h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Completed</span>
                  <span className="text-sm font-bold text-emerald-600">{analytics?.completed_count || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-emerald-600 h-3 rounded-full transition-all"
                    style={{ 
                      width: `${analytics?.total_recovery_records 
                        ? ((analytics.completed_count || 0) / analytics.total_recovery_records) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Partial</span>
                  <span className="text-sm font-bold text-amber-600">{analytics?.partial_count || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-amber-600 h-3 rounded-full transition-all"
                    style={{ 
                      width: `${analytics?.total_recovery_records 
                        ? ((analytics.partial_count || 0) / analytics.total_recovery_records) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Harvested (Awaiting)</span>
                  <span className="text-sm font-bold text-orange-600">{analytics?.harvested_count || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-orange-600 h-3 rounded-full transition-all"
                    style={{ 
                      width: `${analytics?.total_recovery_records 
                        ? ((analytics.harvested_count || 0) / analytics.total_recovery_records) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Pending (Services Not Yet Recorded)</span>
                  <span className="text-sm font-bold text-gray-600">{analytics?.pending_count || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gray-600 h-3 rounded-full transition-all"
                    style={{ 
                      width: `${analytics?.total_recovery_records 
                        ? ((analytics.pending_count || 0) / analytics.total_recovery_records) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Recovery Flow */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Recovery Flow</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-400">
                <p className="text-xs font-semibold text-gray-600 mb-1">PENDING</p>
                <p className="text-sm text-gray-700">Service recorded but harvest not completed yet</p>
              </div>
              
              <div className="text-center text-gray-400">↓</div>
              
              <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-400">
                <p className="text-xs font-semibold text-orange-600 mb-1">HARVESTED</p>
                <p className="text-sm text-gray-700">Harvest marked complete, awaiting inbound bags</p>
              </div>
              
              <div className="text-center text-gray-400">↓</div>
              
              <div className="bg-amber-50 rounded-lg p-4 border-l-4 border-amber-400">
                <p className="text-xs font-semibold text-amber-600 mb-1">PARTIAL</p>
                <p className="text-sm text-gray-700">Some bags received, more expected</p>
              </div>
              
              <div className="text-center text-gray-400">↓</div>
              
              <div className="bg-emerald-50 rounded-lg p-4 border-l-4 border-emerald-400">
                <p className="text-xs font-semibold text-emerald-600 mb-1">COMPLETED</p>
                <p className="text-sm text-gray-700">All expected bags received, recovery closed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Expected vs. Received</h3>
            <p className="text-sm text-blue-800">
              Out of <strong>{analytics?.total_expected || 0} expected bags</strong> across all farmers, 
              <strong> {analytics?.total_received || 0} bags ({recoveryRate}%)</strong> have been received so far.
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Recovery Progress</h3>
            <p className="text-sm text-green-800">
              <strong>{analytics?.completed_count || 0}</strong> recovery records are fully completed. 
              <strong> {analytics?.partial_count || 0}</strong> are partially completed and 
              <strong> {analytics?.harvested_count || 0}</strong> are awaiting inbound.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
