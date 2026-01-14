'use client';

import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '@/lib/api-config';

interface StockData {
  crop: string;
  bags: number;
}

export default function StockPage() {
  const [stock, setStock] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ownerToken');
      
      const response = await fetch(API_ENDPOINTS.ANALYTICS_SNAPSHOT, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success && data.data) {
        // Convert stock by crop to array format
        const stockArray = Object.entries(data.data.stockByCrop || {}).map(([crop, bags]) => ({
          crop,
          bags: bags as number
        }));
        setStock(stockArray);
      }
    } catch (err) {
      console.error('Failed to fetch stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalBags = stock.reduce((sum, item) => sum + item.bags, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Stock Overview</h1>
              <p className="text-sm text-gray-600 mt-1">Current inventory by crop</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchStock}
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
        {/* Total Stock Card */}
        <div 
          className="rounded-2xl p-6 mb-6"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Total Stock</h2>
              <p className="text-4xl font-bold text-gray-900 mt-2">{totalBags.toLocaleString()}</p>
              <p className="text-sm text-gray-600 mt-1">bags across all crops</p>
            </div>
            <div className="text-6xl">📦</div>
          </div>
        </div>

        {/* Stock by Crop */}
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
              <p className="mt-2 text-gray-600">Loading stock data...</p>
            </div>
          ) : stock.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No stock data available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crop Type</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity (Bags)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stock.map((item) => (
                    <tr key={item.crop} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {item.crop}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {item.bags.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">
                        {totalBags > 0 ? ((item.bags / totalBags) * 100).toFixed(1) : 0}%
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
