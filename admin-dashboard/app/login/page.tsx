'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

      localStorage.setItem('adminToken', data.data.accessToken);
      localStorage.setItem('adminUser', JSON.stringify(data.data.user));

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6" 
      style={{ 
        background: 'linear-gradient(135deg, #fafaf8 0%, #efece6 100%)'
      }}
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div 
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5 shadow-lg" 
            style={{ 
              background: 'linear-gradient(135deg, #a7d9a0 0%, #8fcd84 100%)'
            }}
          >
            <svg 
              className="w-11 h-11" 
              style={{ color: '#1e1e1e' }} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.8} 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
              />
            </svg>
          </div>
          <h1 
            className="text-3xl font-medium mb-2" 
            style={{ 
              color: '#1e1e1e',
              letterSpacing: '-0.02em'
            }}
          >
            Trustless Granary
          </h1>
          <p 
            className="text-sm font-medium" 
            style={{ 
              color: '#6b6f69',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}
          >
            Platform Admin
          </p>
        </div>

        {/* Glass Card */}
        <div 
          className="rounded-2xl p-8 shadow-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(138, 156, 123, 0.2)'
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="phone" 
                className="block text-sm font-medium mb-2.5" 
                style={{ color: '#3a3f38' }}
              >
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl transition-all duration-200"
                style={{ 
                  border: '1px solid rgba(138, 156, 123, 0.3)',
                  background: 'rgba(255, 255, 255, 0.6)',
                  color: '#1e1e1e',
                  fontSize: '15px'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8fcd84';
                  e.target.style.boxShadow = '0 0 0 3px rgba(143, 205, 132, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(138, 156, 123, 0.3)';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="0200000000"
                required
              />
            </div>

            <div>
              <label 
                htmlFor="pin" 
                className="block text-sm font-medium mb-2.5" 
                style={{ color: '#3a3f38' }}
              >
                PIN
              </label>
              <input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3 rounded-xl transition-all duration-200"
                style={{ 
                  border: '1px solid rgba(138, 156, 123, 0.3)',
                  background: 'rgba(255, 255, 255, 0.6)',
                  color: '#1e1e1e',
                  fontSize: '15px'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8fcd84';
                  e.target.style.boxShadow = '0 0 0 3px rgba(143, 205, 132, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(138, 156, 123, 0.3)';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Enter 4-digit PIN"
                maxLength={4}
                required
              />
            </div>

            {error && (
              <div 
                className="p-3.5 rounded-xl" 
                style={{ 
                  background: 'rgba(184, 92, 92, 0.08)',
                  border: '1px solid rgba(184, 92, 92, 0.3)'
                }}
              >
                <p className="text-sm font-medium" style={{ color: '#b85c5c' }}>
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #a7d9a0 0%, #8fcd84 100%)',
                color: '#1e1e1e',
                fontSize: '15px',
                letterSpacing: '0.01em'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(143, 205, 132, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs font-medium" style={{ color: '#6b6f69', letterSpacing: '0.03em' }}>
            Admin access only · Unauthorized access prohibited
          </p>
        </div>
      </div>
    </div>
  );
}
