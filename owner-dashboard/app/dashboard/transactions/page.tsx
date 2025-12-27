'use client';

import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '@/lib/api-config';
import type { Transaction } from '@/lib/types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    crop: '',
    buyerType: '',
    paymentStatus: '',
    status: '',
  });

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ownerToken');
      
      const queryParams = new URLSearchParams();
      if (filters.crop) queryParams.append('crop', filters.crop);
      if (filters.buyerType) queryParams.append('buyerType', filters.buyerType);
      if (filters.paymentStatus) queryParams.append('paymentStatus', filters.paymentStatus);
      if (filters.status) queryParams.append('status', filters.status);

      const url = `${API_ENDPOINTS.ANALYTICS_TRANSACTIONS}?${queryParams}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setTransactions(data.data || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      EXECUTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentBadge = (status: string) => {
    const styles = {
      PAID: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
              <p className="text-sm text-gray-600 mt-1">Authoritative ledger of all transactions</p>
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
        {/* Filters */}
        <div 
          className="rounded-2xl p-6 mb-6"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(138, 156, 123, 0.2)'
          }}
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filters.crop}
              onChange={(e) => setFilters({ ...filters, crop: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Crops</option>
              <option value="Maize">Maize</option>
              <option value="Rice">Rice</option>
              <option value="Soybeans">Soybeans</option>
              <option value="Wheat">Wheat</option>
              <option value="Millet">Millet</option>
            </select>

            <select
              value={filters.buyerType}
              onChange={(e) => setFilters({ ...filters, buyerType: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Buyer Types</option>
              <option value="AGGREGATOR">Aggregator</option>
              <option value="OFF_TAKER">Off-Taker</option>
              <option value="OPEN_MARKET">Open Market</option>
            </select>

            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Payment Status</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="EXECUTED">Executed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
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
              <p className="mt-2 text-gray-600">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No transactions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crop</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bags</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <React.Fragment key={tx.transaction_id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(tx.requested_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tx.crop}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tx.bag_quantity}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>{tx.buyer_name || 'N/A'}</div>
                          {tx.buyer_type && (
                            <div className="text-xs text-gray-500">{tx.buyer_type}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {tx.payment_method && (
                              <span className="text-xs text-gray-600">{tx.payment_method}</span>
                            )}
                            {tx.payment_status && (
                              <span className={`px-2 py-1 text-xs rounded-full ${getPaymentBadge(tx.payment_status)}`}>
                                {tx.payment_status}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {tx.total_amount ? `GH₵${tx.total_amount.toLocaleString()}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(tx.current_status)}`}>
                            {tx.current_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => setExpandedId(expandedId === tx.transaction_id ? null : tx.transaction_id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            {expandedId === tx.transaction_id ? '▼ Hide' : '▶ Details'}
                          </button>
                        </td>
                      </tr>
                      {expandedId === tx.transaction_id && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Approved By:</span>
                                  <div className="font-medium">{tx.approver_name || 'N/A'}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Executed By:</span>
                                  <div className="font-medium">{tx.executor_name || 'N/A'}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Price Per Bag:</span>
                                  <div className="font-medium">
                                    {tx.price_per_bag ? `GH₵${tx.price_per_bag.toLocaleString()}` : 'N/A'}
                                  </div>
                                </div>
                              </div>
                              {tx.buyer_phone && (
                                <div className="text-sm">
                                  <span className="text-gray-500">Buyer Contact:</span>
                                  <div className="font-medium">{tx.buyer_phone}</div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
