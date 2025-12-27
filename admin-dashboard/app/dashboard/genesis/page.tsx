'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_ENDPOINTS } from '@/lib/api-config';

interface Warehouse {
  id: string;
  name: string;
  status: string;
}

interface InventoryItem {
  cropType: string;
  bags: number;
}

interface ToolItem {
  toolType: string;
  quantity: number;
}

export default function GenesisPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [inventory, setInventory] = useState<InventoryItem[]>([{ cropType: '', bags: 0 }]);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(API_ENDPOINTS.ADMIN_WAREHOUSES, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        // Only show warehouses in SETUP status
        const setupWarehouses = (data.data || []).filter((w: Warehouse) => 
          w.status === 'SETUP' || w.status === 'GENESIS_PENDING'
        );
        setWarehouses(setupWarehouses);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addInventoryRow = () => {
    setInventory([...inventory, { cropType: '', bags: 0 }]);
  };

  const removeInventoryRow = (index: number) => {
    setInventory(inventory.filter((_, i) => i !== index));
  };

  const updateInventoryItem = (index: number, field: keyof InventoryItem, value: string | number) => {
    const updated = [...inventory];
    updated[index] = { ...updated[index], [field]: value };
    setInventory(updated);
  };

  const addToolRow = () => {
    setTools([...tools, { toolType: '', quantity: 1 }]);
  };

  const removeToolRow = (index: number) => {
    setTools(tools.filter((_, i) => i !== index));
  };

  const updateToolItem = (index: number, field: keyof ToolItem, value: string | number) => {
    const updated = [...tools];
    updated[index] = { ...updated[index], [field]: value };
    setTools(updated);
  };

  const handleSubmitGenesis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouse || inventory.length === 0) {
      alert('Please select a warehouse and add at least one crop');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(API_ENDPOINTS.ADMIN_GENESIS(selectedWarehouse), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inventory: inventory.filter(item => item.cropType && item.bags > 0),
          tools: tools.filter(item => item.toolType && item.quantity > 0),
          notes,
          photoUrls: photos,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Genesis inventory recorded! Awaiting owner confirmation.');
        setSelectedWarehouse('');
        setInventory([{ cropType: '', bags: 0 }]);
        setTools([]);
        setNotes('');
        setPhotos([]);
        fetchWarehouses();
      } else {
        alert(data.error || 'Failed to record genesis');
      }
    } catch (error) {
      console.error('Failed to submit genesis:', error);
      alert('Failed to record genesis');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cropTypes = ['Maize', 'Rice', 'Soybeans', 'Wheat', 'Millet'];

  return (
    <div style={{ background: 'linear-gradient(135deg, #fafaf8 0%, #efece6 100%)', minHeight: '100vh' }}>
      {/* Header */}
      <header 
        className="border-b sticky top-0 z-50"
        style={{ 
          background: 'rgba(239, 236, 230, 0.8)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(138, 156, 123, 0.2)'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-lg transition-colors"
            style={{ background: 'rgba(200, 185, 166, 0.3)' }}
          >
            <svg className="w-5 h-5" style={{ color: '#3a3f38' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-medium" style={{ color: '#1e1e1e' }}>Genesis Setup</h1>
            <p className="text-xs" style={{ color: '#6b6f69' }}>Record initial warehouse inventory</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" 
                 style={{ borderColor: '#d9d9d5', borderTopColor: '#8fcd84' }} />
          </div>
        ) : (
          <form onSubmit={handleSubmitGenesis} className="space-y-6">
            {/* Warehouse Selection */}
            <div 
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(138, 156, 123, 0.2)'
              }}
            >
              <h2 className="text-lg font-medium mb-4" style={{ color: '#1e1e1e' }}>Select Warehouse</h2>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-base"
                style={{ border: '1px solid rgba(138, 156, 123, 0.3)', background: 'rgba(255, 255, 255, 0.6)', color: '#1e1e1e' }}
                required
              >
                <option value="">Choose a warehouse...</option>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name} ({wh.status})</option>
                ))}
              </select>
            </div>

            {/* Inventory Items */}
            <div 
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(138, 156, 123, 0.2)'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium" style={{ color: '#1e1e1e' }}>Initial Inventory</h2>
                <button
                  type="button"
                  onClick={addInventoryRow}
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{ background: 'linear-gradient(135deg, #a7d9a0 0%, #8fcd84 100%)', color: '#1e1e1e' }}
                >
                  + Add Crop
                </button>
              </div>

              <div className="space-y-3">
                {inventory.map((item, index) => (
                  <div key={index} className="flex gap-3">
                    <select
                      value={item.cropType}
                      onChange={(e) => updateInventoryItem(index, 'cropType', e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-lg"
                      style={{ border: '1px solid rgba(138, 156, 123, 0.3)', background: 'rgba(255, 255, 255, 0.6)', color: '#1e1e1e' }}
                      required
                    >
                      <option value="">Select crop type...</option>
                      {cropTypes.map(crop => (
                        <option key={crop} value={crop}>{crop}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={item.bags || ''}
                      onChange={(e) => updateInventoryItem(index, 'bags', parseInt(e.target.value) || 0)}
                      className="w-32 px-4 py-2.5 rounded-lg"
                      style={{ border: '1px solid rgba(138, 156, 123, 0.3)', background: 'rgba(255, 255, 255, 0.6)', color: '#1e1e1e' }}
                      placeholder="Bags"
                      min="1"
                      required
                    />
                    {inventory.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInventoryRow(index)}
                        className="p-2.5 rounded-lg"
                        style={{ background: 'rgba(184, 92, 92, 0.2)', color: '#b85c5c' }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tool Register (Optional) */}
            <div 
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(138, 156, 123, 0.2)'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium" style={{ color: '#1e1e1e' }}>Tool Register (Optional)</h2>
                  <p className="text-sm mt-1" style={{ color: '#6b6f69' }}>Register tools for accountability tracking</p>
                </div>
                <button
                  type="button"
                  onClick={addToolRow}
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{ background: 'linear-gradient(135deg, #d4b896 0%, #c8a97f 100%)', color: '#1e1e1e' }}
                >
                  + Add Tool
                </button>
              </div>

              {tools.length > 0 && (
                <div className="space-y-3">
                  {tools.map((tool, index) => (
                    <div key={index} className="flex gap-3">
                      <input
                        type="text"
                        value={tool.toolType}
                        onChange={(e) => updateToolItem(index, 'toolType', e.target.value)}
                        className="flex-1 px-4 py-2.5 rounded-lg"
                        style={{ border: '1px solid rgba(138, 156, 123, 0.3)', background: 'rgba(255, 255, 255, 0.6)', color: '#1e1e1e' }}
                        placeholder="Tool type (e.g., Hoe, Spade, Rake)"
                        required
                      />
                      <input
                        type="number"
                        value={tool.quantity || ''}
                        onChange={(e) => updateToolItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-32 px-4 py-2.5 rounded-lg"
                        style={{ border: '1px solid rgba(138, 156, 123, 0.3)', background: 'rgba(255, 255, 255, 0.6)', color: '#1e1e1e' }}
                        placeholder="Qty"
                        min="1"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeToolRow(index)}
                        className="p-2.5 rounded-lg"
                        style={{ background: 'rgba(184, 92, 92, 0.2)', color: '#b85c5c' }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {tools.length === 0 && (
                <div className="text-center py-8" style={{ color: '#6b6f69' }}>
                  <p className="text-sm">No tools added. Click "Add Tool" to start tracking tools.</p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div 
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(138, 156, 123, 0.2)'
              }}
            >
              <h2 className="text-lg font-medium mb-4" style={{ color: '#1e1e1e' }}>Notes (Optional)</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 rounded-lg resize-none"
                style={{ border: '1px solid rgba(138, 156, 123, 0.3)', background: 'rgba(255, 255, 255, 0.6)', color: '#1e1e1e' }}
                rows={4}
                placeholder="Add any additional notes about the initial inventory..."
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !selectedWarehouse}
              className="w-full py-3.5 rounded-xl font-medium disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg, #a7d9a0 0%, #8fcd84 100%)', color: '#1e1e1e', fontSize: '16px' }}
            >
              {isSubmitting ? 'Submitting...' : 'Record Genesis Inventory'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
