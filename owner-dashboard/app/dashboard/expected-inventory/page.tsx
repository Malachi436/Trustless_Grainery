'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/lib/api-config';

interface ExpectedInventoryItem {
  service_record_id: string;
  farmer_name: string;
  farmer_id: string;
  field_agent_name: string;
  expected_bags: number;
  expected_recovery_date?: string;
  received_bags: number;
  recovery_status: string;
  service_date: string;
  warehouse_id: string;
}

export default function ExpectedInventoryPage() {
  const [inventory, setInventory] = useState<ExpectedInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'HARVESTED' | 'PARTIAL' | 'COMPLETED'>('ALL');
  const [summary, setSummary] = useState({
    totalExpected: 0,
    totalReceived: 0,
    outstanding: 0,
    completedCount: 0,
    pendingCount: 0,
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ownerToken');
      
      if (!token) {
        window.location.href = '/login';
        return;
      }

      // Fetch expected inventory from analytics snapshot
      const response = await fetch(`${API_ENDPOINTS.ANALYTICS_SNAPSHOT}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch expected inventory');
      }

      const data = await response.json();
      const items = data.data?.expected_inventory || [];
      setInventory(items);

      // Calculate summary
      const totalExpected = items.reduce((sum: number, item: any) => sum + (item.expected_bags || 0), 0);
      const totalReceived = items.reduce((sum: number, item: any) => sum + (item.received_bags || 0), 0);
      const outstanding = totalExpected - totalReceived;
      const completed = items.filter((item: any) => item.recovery_status === 'COMPLETED').length;
      const pending = items.filter((item: any) => item.recovery_status === 'PENDING').length;

      setSummary({
        totalExpected,
        totalReceived,
        outstanding,
        completedCount: completed,
        pendingCount: pending,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PARTIAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'HARVESTED':
        return 'bg-orange-100 text-orange-800';
      case 'PENDING':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredItems = filter === 'ALL' 
    ? inventory 
    : inventory.filter(item => item.recovery_status === filter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading expected inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <p className="text-red-600 font-semibold">Error: {error}</p>
          <button
            onClick={fetchInventory}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Expected Inventory</h1>
            <p className="text-gray-600">Track outgrower service progress and recovery status</p>
          </div>
          <Link href="/dashboard">
            <button className="px-6 py-2 bg-white text-green-600 rounded-lg shadow hover:shadow-lg transition">
              ← Back
            </button>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm font-semibold mb-2">Total Expected</p>
            <p className="text-3xl font-bold text-blue-600">{summary.totalExpected}</p>
            <p className="text-gray-500 text-xs mt-2">bags</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm font-semibold mb-2">Total Received</p>
            <p className="text-3xl font-bold text-green-600">{summary.totalReceived}</p>
            <p className="text-gray-500 text-xs mt-2">bags</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm font-semibold mb-2">Outstanding</p>
            <p className="text-3xl font-bold text-red-600">{summary.outstanding}</p>
            <p className="text-gray-500 text-xs mt-2">bags</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm font-semibold mb-2">Completed</p>
            <p className="text-3xl font-bold text-emerald-600">{summary.completedCount}</p>
            <p className="text-gray-500 text-xs mt-2">records</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm font-semibold mb-2">Pending</p>
            <p className="text-3xl font-bold text-gray-600">{summary.pendingCount}</p>
            <p className="text-gray-500 text-xs mt-2">records</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['ALL', 'PENDING', 'HARVESTED', 'PARTIAL', 'COMPLETED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === status
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 shadow hover:shadow-md'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Farmer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Field Agent</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Expected</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Received</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Outstanding</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Progress</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Service Date</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Expected Recovery</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      No expected inventory found for the selected filter
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const outstanding = item.expected_bags - (item.received_bags || 0);
                    const progressPercent = Math.min(
                      ((item.received_bags || 0) / (item.expected_bags || 1)) * 100,
                      100
                    );

                    return (
                      <tr key={item.service_record_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {item.farmer_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {item.field_agent_name}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-blue-600">
                          {item.expected_bags}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-green-600">
                          {item.received_bags || 0}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-red-600">
                          {outstanding}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all"
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{Math.round(progressPercent)}%</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.recovery_status)}`}>
                            {item.recovery_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600">
                          {new Date(item.service_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600">
                          {item.expected_recovery_date 
                            ? new Date(item.expected_recovery_date).toLocaleDateString()
                            : <span className="text-gray-400">Not set</span>
                          }
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Expected inventory is derived from service records created by field agents.
            Progress updates in real-time as recovery inbound is recorded.
          </p>
        </div>
      </div>
    </div>
  );
}
