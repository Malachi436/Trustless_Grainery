'use client';

import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '@/lib/api-config';
import type { AttendantActivity } from '@/lib/types';

export default function AttendantsPage() {
  const [attendants, setAttendants] = useState<AttendantActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendants();
  }, []);

  const fetchAttendants = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ownerToken');
      
      const response = await fetch(API_ENDPOINTS.ANALYTICS_ATTENDANTS, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setAttendants(data.data || []);
    } catch (err) {
      console.error('Failed to fetch attendants:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attendant Activity</h1>
              <p className="text-sm text-gray-600 mt-1">Track attendant performance and activity</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchAttendants}
                className="px-4 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Attendants Table */}
        <div 
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(138, 156, 123, 0.2)'
          }}
        >
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading attendants...</p>
            </div>
          ) : attendants.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No attendants found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispatches Executed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tools Assigned</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time to Execute</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendants.map((attendant) => (
                    <tr key={attendant.attendant_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {attendant.attendant_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {attendant.requests_submitted}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {attendant.dispatches_executed}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {attendant.tools_currently_assigned}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {attendant.avg_hours_approval_to_execution !== null 
                          ? `${attendant.avg_hours_approval_to_execution.toFixed(1)} hours`
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
