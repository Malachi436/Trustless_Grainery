'use client';

import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '@/lib/api-config';

interface Batch {
  id: string;
  batch_code: string;
  crop_type: string;
  source_type: string;
  source_name: string | null;
  initial_bags: number;
  remaining_bags: number;
  purchase_price_per_bag: number | null;
  created_at: string;
  qr_code_data: string | null;
  inbound_photos?: string[];
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [filters, setFilters] = useState({
    crop: '',
    available: 'true',
  });

  useEffect(() => {
    fetchBatches();
  }, [filters]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ownerToken');
      
      const queryParams = new URLSearchParams();
      if (filters.crop) queryParams.append('crop', filters.crop);
      if (filters.available) queryParams.append('available', filters.available);

      const url = `${API_ENDPOINTS.OWNER_BATCHES}?${queryParams}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setBatches(data.data || []);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintQR = (batch: Batch) => {
    if (!batch.qr_code_data) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code - ${batch.batch_code}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              font-family: Arial, sans-serif;
            }
            .qr-label {
              border: 2px solid #000;
              padding: 20px;
              text-align: center;
              width: 300px;
            }
            .qr-code {
              width: 250px;
              height: 250px;
              margin: 10px auto;
            }
            .batch-info {
              margin-top: 10px;
              font-size: 14px;
            }
            .batch-code {
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-label">
            <img src="${batch.qr_code_data}" alt="QR Code" class="qr-code" />
            <div class="batch-code">${batch.batch_code}</div>
            <div class="batch-info">
              <div>${batch.crop_type}</div>
              <div>${batch.initial_bags} bags</div>
              <div>${new Date(batch.created_at).toLocaleDateString()}</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getSourceBadge = (sourceType: string) => {
    const colors: Record<string, string> = {
      OWN_FARM: 'bg-green-100 text-green-800',
      SME: 'bg-blue-100 text-blue-800',
      SMALL_FARMER: 'bg-yellow-100 text-yellow-800',
      OUTGROWER: 'bg-purple-100 text-purple-800',
    };
    return colors[sourceType] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Active Batches</h1>
              <p className="text-sm text-gray-600 mt-1">Manage inventory batches with QR tracking</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchBatches}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              value={filters.available}
              onChange={(e) => setFilters({ ...filters, available: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Batches</option>
              <option value="true">Available Only</option>
            </select>
          </div>
        </div>

        {/* Batches Grid */}
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
              <p className="mt-2 text-gray-600">Loading batches...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No batches found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-mono text-sm font-semibold text-gray-900">
                        {batch.batch_code}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(batch.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getSourceBadge(batch.source_type)}`}>
                      {batch.source_type.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Crop:</span>
                      <span className="font-medium">{batch.crop_type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Initial:</span>
                      <span className="font-medium">{batch.initial_bags} bags</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Remaining:</span>
                      <span className={`font-medium ${batch.remaining_bags === 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {batch.remaining_bags} bags
                      </span>
                    </div>
                    {batch.source_name && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Source:</span>
                        <span className="font-medium text-xs">{batch.source_name}</span>
                      </div>
                    )}
                    {batch.purchase_price_per_bag && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Price/bag:</span>
                        <span className="font-medium">GH₵{batch.purchase_price_per_bag}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {batch.inbound_photos && batch.inbound_photos.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedBatch(batch);
                          setShowQRModal(true);
                        }}
                        className="flex-1 px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        📸 View Photos ({batch.inbound_photos.length})
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedBatch(batch);
                        setShowQRModal(true);
                      }}
                      className="flex-1 px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      📷 View QR
                    </button>
                    <button
                      onClick={() => handlePrintQR(batch)}
                      className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      🖨️ Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && selectedBatch && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => setShowQRModal(false)}
        >
          <div 
            className="relative max-w-md w-full bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Batch QR Code</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="px-3 py-1 text-gray-600 hover:text-gray-900 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6 text-center">
              {selectedBatch.qr_code_data && (
                <img
                  src={selectedBatch.qr_code_data}
                  alt="Batch QR Code"
                  className="w-64 h-64 mx-auto mb-4"
                />
              )}
              <div className="font-mono text-lg font-bold mb-2">{selectedBatch.batch_code}</div>
              <div className="text-sm text-gray-600 mb-4">
                {selectedBatch.crop_type} • {selectedBatch.initial_bags} bags
              </div>
              
              {/* Inbound Photos */}
              {selectedBatch.inbound_photos && selectedBatch.inbound_photos.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Inbound Photos</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedBatch.inbound_photos.map((photoUrl, index) => (
                      <img
                        key={index}
                        src={photoUrl}
                        alt={`Inbound photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => handlePrintQR(selectedBatch)}
                className="w-full px-4 py-2 mt-4 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                🖨️ Print QR Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
