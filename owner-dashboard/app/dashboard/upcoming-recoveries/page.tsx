'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/lib/api-config';

interface UpcomingRecovery {
  service_record_id: string;
  farmer_id: string;
  farmer_name: string;
  field_agent_id: string;
  field_agent_name: string;
  warehouse_id: string;
  expected_bags: number;
  expected_recovery_date: string;
  maize_color?: string;
  received_bags: number;
  recovery_status: string;
  service_date: string;
  days_until_recovery: number;
  date_update_history?: any;
}

interface DateChangeNotification {
  id: string;
  service_record_id: string;
  old_date: string;
  new_date: string;
  reason: string;
  created_at: string;
  farmer_name: string;
  field_agent_name: string;
  expected_bags: number;
}

export default function UpcomingRecoveriesPage() {
  const [upcoming, setUpcoming] = useState<UpcomingRecovery[]>([]);
  const [dateChanges, setDateChanges] = useState<DateChangeNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'changes'>('upcoming');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ownerToken');
      
      if (!token) {
        window.location.href = '/login';
        return;
      }

      // Fetch upcoming recoveries
      const upcomingResponse = await fetch(`${API_ENDPOINTS.OWNER_UPCOMING_RECOVERIES}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!upcomingResponse.ok) {
        throw new Error('Failed to fetch upcoming recoveries');
      }

      const upcomingData = await upcomingResponse.json();
      setUpcoming(upcomingData.data || []);

      // Fetch date change notifications
      const changesResponse = await fetch(`${API_ENDPOINTS.OWNER_DATE_CHANGES}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!changesResponse.ok) {
        throw new Error('Failed to fetch date changes');
      }

      const changesData = await changesResponse.json();
      setDateChanges(changesData.data || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysColor = (days: number) => {
    if (days <= 7) return 'text-red-600 font-bold';
    if (days <= 14) return 'text-orange-600 font-semibold';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading upcoming recoveries...</p>
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
            onClick={fetchData}
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
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Upcoming Recoveries</h1>
            <p className="text-gray-600">Next 4 weeks • Updates daily</p>
          </div>
          <Link href="/dashboard">
            <button className="px-6 py-2 bg-white text-green-600 rounded-lg shadow hover:shadow-lg transition">
              ← Back
            </button>
          </Link>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'upcoming'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-white text-gray-700 shadow hover:shadow-md'
            }`}
          >
            Upcoming ({upcoming.length})
          </button>
          <button
            onClick={() => setActiveTab('changes')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'changes'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-white text-gray-700 shadow hover:shadow-md'
            }`}
          >
            Date Changes ({dateChanges.length})
          </button>
        </div>

        {/* Upcoming Recoveries Tab */}
        {activeTab === 'upcoming' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Farmer</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Field Agent</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Expected Bags</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Maize Color</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Expected Date</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Days Until</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No upcoming recoveries in the next 4 weeks
                      </td>
                    </tr>
                  ) : (
                    upcoming.map((item) => (
                      <tr key={item.service_record_id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{item.farmer_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.field_agent_name}</td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-blue-600">
                          {item.expected_bags}
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          {item.maize_color ? (
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              item.maize_color === 'RED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {item.maize_color}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-700">
                          {formatDate(item.expected_recovery_date)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          <span className={getDaysColor(item.days_until_recovery)}>
                            {item.days_until_recovery} days
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            item.recovery_status === 'PENDING' ? 'bg-gray-100 text-gray-800' :
                            item.recovery_status === 'HARVESTED' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.recovery_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Date Changes Tab */}
        {activeTab === 'changes' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Date Changes (Last 30 Days)</h2>
              <div className="space-y-4">
                {dateChanges.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No date changes in the last 30 days</p>
                ) : (
                  dateChanges.map((change) => (
                    <div key={change.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{change.farmer_name}</p>
                          <p className="text-sm text-gray-600">Field Agent: {change.field_agent_name}</p>
                          <p className="text-sm text-gray-600">Expected: {change.expected_bags} bags</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{formatDate(change.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm text-gray-700">{formatDate(change.old_date)}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-sm font-semibold text-green-700">{formatDate(change.new_date)}</span>
                      </div>
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mt-2">
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">Reason:</span> {change.reason}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
