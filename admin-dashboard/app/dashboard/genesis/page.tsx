'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import { API_ENDPOINTS } from '@/lib/api-config';
import type { Warehouse } from '@/lib/types';

const CROP_TYPES = [
  { value: 'maize', label: 'Maize' },
  { value: 'rice', label: 'Rice' },
  { value: 'wheat', label: 'Wheat' },
  { value: 'sorghum', label: 'Sorghum' },
  { value: 'barley', label: 'Barley' },
  { value: 'millet', label: 'Millet' },
  { value: 'soybeans', label: 'Soybeans' },
];

interface InventoryItem {
  cropType: string;
  bags: number;
}

export default function GenesisPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [currentCrop, setCurrentCrop] = useState('maize');
  const [currentBags, setCurrentBags] = useState('');
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
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        // Filter warehouses that need genesis
        const needsGenesis = (data.data || []).filter(
          (w: Warehouse) => w.status === 'SETUP' || w.status === 'GENESIS_PENDING'
        );
        setWarehouses(needsGenesis);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCrop = () => {
    const bags = parseInt(currentBags);
    if (!bags || bags <= 0) return;

    const existingIndex = inventory.findIndex(item => item.cropType === currentCrop);
    
    if (existingIndex >= 0) {
      const updated = [...inventory];
      updated[existingIndex].bags += bags;
      setInventory(updated);
    } else {
      setInventory([...inventory, { cropType: currentCrop, bags }]);
    }

    setCurrentBags('');
  };

  const handleRemoveCrop = (cropType: string) => {
    setInventory(inventory.filter(item => item.cropType !== cropType));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // In a real app, upload to storage and get URLs
    // For now, create local URLs
    const urls: string[] = [];
    Array.from(files).forEach(file => {
      urls.push(URL.createObjectURL(file));
    });
    setPhotos([...photos, ...urls]);
  };

  const handleSubmitGenesis = async () => {
    if (!selectedWarehouse || inventory.length === 0) {
      alert('Please select a warehouse and add at least one crop');
      return;
    }

    if (photos.length === 0) {
      const confirmed = confirm('No photos attached. Photos are mandatory for Genesis. Continue anyway?');
      if (!confirmed) return;
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
          inventory,
          notes,
          photoUrls: photos,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Genesis inventory recorded! Awaiting owner confirmation.');
        // Reset form
        setSelectedWarehouse('');
        setInventory([]);
        setNotes('');
        setPhotos([]);
        fetchWarehouses();
      }
    } catch (error) {
      console.error('Failed to submit genesis:', error);
      alert('Failed to record genesis inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalBags = inventory.reduce((sum, item) => sum + item.bags, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-agricultural-beige via-agricultural-sand to-agricultural-clay">
      {/* Header */}
      <header className="glass-panel border-b border-white/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-agricultural-earth hover:text-gray-900">
            ← Back
          </Link>
          <div className="text-2xl">🌱</div>
          <h1 className="text-xl font-bold text-gray-900">Genesis Inventory Setup</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🌱</div>
            <p className="text-agricultural-earth">Loading...</p>
          </div>
        ) : warehouses.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">All Warehouses Configured</h3>
            <p className="text-agricultural-earth">No warehouses need genesis setup at this time</p>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            {/* Warehouse Selection */}
            <GlassCard className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">1. Select Warehouse</h2>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-agricultural-clay bg-white/50 focus:outline-none focus:ring-2 focus:ring-agricultural-green"
              >
                <option value="">Choose a warehouse...</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} - {warehouse.location}
                  </option>
                ))}
              </select>
            </GlassCard>

            {/* Add Crops */}
            <GlassCard className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">2. Add Initial Inventory</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Crop Type
                  </label>
                  <select
                    value={currentCrop}
                    onChange={(e) => setCurrentCrop(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-agricultural-clay bg-white/50 focus:outline-none focus:ring-2 focus:ring-agricultural-green"
                  >
                    {CROP_TYPES.map(crop => (
                      <option key={crop.value} value={crop.value}>{crop.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Bags
                  </label>
                  <input
                    type="number"
                    value={currentBags}
                    onChange={(e) => setCurrentBags(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-agricultural-clay bg-white/50 focus:outline-none focus:ring-2 focus:ring-agricultural-green"
                    placeholder="100"
                    min="1"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleAddCrop}
                    className="w-full px-4 py-3 rounded-xl bg-agricultural-green hover:bg-agricultural-green/90 text-white font-semibold transition-all"
                  >
                    Add Crop
                  </button>
                </div>
              </div>

              {/* Inventory List */}
              {inventory.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Inventory:</h3>
                  {inventory.map((item) => (
                    <div key={item.cropType} className="flex items-center justify-between p-3 rounded-lg bg-agricultural-green-light border border-agricultural-green/20">
                      <span className="font-medium text-gray-900">
                        {CROP_TYPES.find(c => c.value === item.cropType)?.label}: {item.bags} bags
                      </span>
                      <button
                        onClick={() => handleRemoveCrop(item.cropType)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className="text-right font-bold text-gray-900 pt-2">
                    Total: {totalBags} bags
                  </div>
                </div>
              )}
            </GlassCard>

            {/* Photos */}
            <GlassCard className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">3. Upload Photos (Mandatory)</h2>
              <p className="text-sm text-agricultural-earth mb-4">
                Upload photos of the inventory pile and warehouse
              </p>
              
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="w-full px-4 py-3 rounded-xl border border-agricultural-clay bg-white/50 focus:outline-none focus:ring-2 focus:ring-agricultural-green"
              />

              {photos.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                      <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Notes */}
            <GlassCard className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">4. Additional Notes (Optional)</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-agricultural-clay bg-white/50 focus:outline-none focus:ring-2 focus:ring-agricultural-green resize-none"
                rows={4}
                placeholder="Any additional information about the initial inventory..."
              />
            </GlassCard>

            {/* Submit */}
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-4 rounded-xl bg-white/50 hover:bg-white/70 text-gray-700 font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitGenesis}
                disabled={isSubmitting || !selectedWarehouse || inventory.length === 0}
                className="flex-1 px-6 py-4 rounded-xl bg-agricultural-green hover:bg-agricultural-green/90 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isSubmitting ? 'Recording Genesis...' : 'Record Genesis Inventory'}
              </button>
            </div>

            <div className="text-center text-sm text-agricultural-earth">
              Once submitted, the warehouse will change to GENESIS_PENDING status.<br />
              The owner must confirm via their dashboard to activate the warehouse.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
