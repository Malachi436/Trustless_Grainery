'use client';

import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '@/lib/api-config';
import type { OutstandingCredit } from '@/lib/types';

export default function CreditPage() {
  const [credits, setCredits] = useState<OutstandingCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCredit, setSelectedCredit] = useState<OutstandingCredit | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const totalOutstanding = credits.reduce((sum, c) => sum + parseFloat(c.total_amount?.toString() || '0'), 0);

  const handleRecordPayment = (credit: OutstandingCredit) => {
    setSelectedCredit(credit);
    setAmountPaid('');
    setNotes('');
    setShowPaymentModal(true);
  };

  const submitPayment = async () => {
    if (!selectedCredit || !amountPaid) return;

    const amount = parseFloat(amountPaid);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const remaining = (selectedCredit.remaining_balance ?? selectedCredit.total_amount ?? 0);
    if (amount > remaining) {
      alert(`Amount exceeds remaining balance of GH₵${remaining.toFixed(2)}`);
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('ownerToken');
      
      const response = await fetch(API_ENDPOINTS.RECORD_CREDIT_PAYMENT(selectedCredit.transaction_id), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amountPaid: amount,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.data.message || 'Payment recorded successfully');
        setShowPaymentModal(false);
        fetchCredits(); // Refresh the list
      } else {
        alert(data.error || 'Failed to record payment');
      }
    } catch (err) {
      console.error('Failed to record payment:', err);
      alert('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

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
            <div className="flex gap-2">
              <button
                onClick={fetchCredits}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Outstanding</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {credits.map((credit) => {
                    const daysOutstanding = credit.days_outstanding || 0;
                    const urgencyColor = daysOutstanding > 30 ? 'text-red-600' : 
                                       daysOutstanding > 14 ? 'text-yellow-600' : 
                                       'text-gray-900';
                    const totalAmount = parseFloat(credit.total_amount?.toString() || '0');
                    const paidAmount = parseFloat(credit.total_paid?.toString() || '0');
                    const remainingAmount = parseFloat(credit.remaining_balance?.toString() || totalAmount.toString());
                    
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
                          GH₵{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-green-600">
                          {paidAmount > 0 ? `GH₵${paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-red-600">
                          GH₵{remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`px-6 py-4 text-sm font-medium ${urgencyColor}`}>
                          {daysOutstanding} days
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleRecordPayment(credit)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs font-medium"
                          >
                            Record Payment
                          </button>
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
              <p className="font-medium mb-1">Payment Recording</p>
              <p>
                Owners can record partial or full payments. The system tracks total paid, remaining balance, and payment history for each credit transaction.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedCredit && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => !submitting && setShowPaymentModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Record Payment</h3>
            
            <div className="space-y-4">
              {/* Credit Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Buyer:</span>
                  <span className="font-medium">{selectedCredit.buyer_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">GH₵{parseFloat(selectedCredit.total_amount?.toString() || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Already Paid:</span>
                  <span className="font-medium text-green-600">GH₵{parseFloat(selectedCredit.total_paid?.toString() || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-gray-600 font-semibold">Remaining:</span>
                  <span className="font-bold text-red-600">GH₵{parseFloat(selectedCredit.remaining_balance?.toString() || selectedCredit.total_amount?.toString() || '0').toFixed(2)}</span>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Paid <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={submitting}
                />
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment details or notes..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={submitting}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={submitPayment}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting || !amountPaid}
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
