'use client';

import React from 'react';

export default function StockPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Stock Overview</h1>
              <p className="text-sm text-gray-600 mt-1">Current inventory status</p>
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
        <div 
          className="rounded-2xl p-12 text-center"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(138, 156, 123, 0.2)'
          }}
        >
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Stock Overview</h2>
          <p className="text-gray-600 mb-6">
            Stock details are available on the main dashboard. View batch-specific details in the Batches section.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard/batches'}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            View Batch Analytics
          </button>
        </div>
      </div>
    </div>
  );
}
