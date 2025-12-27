'use client';

import React from 'react';

export default function ApprovalsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
              <p className="text-sm text-gray-600 mt-1">Review and approve outbound requests</p>
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
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Approvals</h2>
          <p className="text-gray-600 mb-6">
            Approvals are handled through the mobile app. Use your Owner mobile app to review and approve pending requests.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-blue-800">
              ℹ️ For security and workflow purposes, request approvals must be completed on the mobile application with proper batch selection and commercial details entry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
