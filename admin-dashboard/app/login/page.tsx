'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import { API_ENDPOINTS } from '@/lib/api-config';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          pin,
          role: 'PLATFORM_ADMIN',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }

      // Store auth token
      localStorage.setItem('adminToken', data.data.accessToken);
      localStorage.setItem('adminUser', JSON.stringify(data.data.user));

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-agricultural-beige via-agricultural-sand to-agricultural-clay flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 rounded-2xl glass-panel mb-4">
            <div className="text-5xl">🌾</div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Trustless Granary</h1>
          <p className="text-agricultural-earth">Platform Admin Dashboard</p>
        </div>

        {/* Login Card */}
        <GlassCard className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-agricultural-clay bg-white/50 focus:outline-none focus:ring-2 focus:ring-agricultural-green focus:border-transparent transition-all"
                placeholder="0200000000"
                required
              />
            </div>

            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                PIN
              </label>
              <input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-agricultural-clay bg-white/50 focus:outline-none focus:ring-2 focus:ring-agricultural-green focus:border-transparent transition-all"
                placeholder="****"
                maxLength={4}
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-agricultural-green hover:bg-agricultural-green/90 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-agricultural-clay">
            <p className="text-xs text-center text-agricultural-earth">
              Admin credentials required. Unauthorized access is prohibited.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
