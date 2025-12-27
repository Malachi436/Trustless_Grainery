'use client';

import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '@/lib/api-config';
import type { OutstandingCredit } from '@/lib/types';

export default function CreditPage() {
  const [credits, setCredits] = useState<OutstandingCredit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ownerToken');
      
      const response = await fetch(API_ENDPOINTS.ANALYTICS_CREDIT, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setCredits(data.data || []);
    } catch (err) {
      console.error('Failed to fetch credit:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalOutstanding = credits.reduce((sum, c) => sum + (c.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Outstanding Credit</h1>
              <p className="text-sm text-gray-600 mt-1">Monitor pending credit payments</p>
            </div>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Card */}
        <div 
          className="rounded-2xl p-6 mb-6"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Outstanding Credit</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                GH₵{totalOutstanding.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Pending Payments</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {credits.length}
              </p>
            </div>
          </div>
        </div>

        {/* Credit Table */}
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
              <p className="mt-2 text-gray-600">Loading credit records...</p>
            </div>
          ) : credits.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-gray-600">No outstanding credit payments</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crop</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bags</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Outstanding</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {credits.map((credit) => {
                    const daysOutstanding = credit.days_outstanding || 0;
                    const urgencyColor = daysOutstanding > 30 ? 'text-red-600' : 
                                       daysOutstanding > 14 ? 'text-yellow-600' : 
                                       'text-gray-900';
                    
                    return (
                      <tr key={credit.transaction_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {credit.buyer_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {credit.buyer_phone || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {credit.crop}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {credit.bag_quantity}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          GH₵{(credit.total_amount || 0).toLocaleString()}
                        </td>
                        <td className={`px-6 py-4 text-sm font-medium ${urgencyColor}`}>
                          {daysOutstanding} days
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {credit.approved_by_name || 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notice */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Payment Confirmation</p>
              <p>
                Only attendants can mark credit payments as received by creating a PAYMENT_CONFIRMED event.
                Owners cannot directly update payment status to maintain separation of duties.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
