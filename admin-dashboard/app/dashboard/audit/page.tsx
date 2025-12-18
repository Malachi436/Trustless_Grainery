'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import { API_ENDPOINTS } from '@/lib/api-config';
import type { AuditEvent } from '@/lib/types';

export default function AuditPage() {
  const router = useRouter();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchAudit();
  }, []);

  const fetchAudit = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(API_ENDPOINTS.ADMIN_AUDIT, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setEvents(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch audit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('WAREHOUSE')) return '🏢';
    if (eventType.includes('USER')) return '👤';
    if (eventType.includes('GENESIS')) return '🌱';
    if (eventType.includes('SUSPEND')) return '🚫';
    return '📋';
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes('CREATE')) return 'text-green-600';
    if (eventType.includes('SUSPEND') || eventType.includes('DELETE')) return 'text-red-600';
    if (eventType.includes('GENESIS')) return 'text-amber-600';
    return 'text-blue-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-agricultural-beige via-agricultural-sand to-agricultural-clay">
      {/* Header */}
      <header className="glass-panel border-b border-white/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-agricultural-earth hover:text-gray-900">
            ← Back
          </Link>
          <div className="text-2xl">📋</div>
          <h1 className="text-xl font-bold text-gray-900">Onboarding Audit Trail</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-agricultural-earth">Loading audit trail...</p>
          </div>
        ) : events.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Activity Yet</h3>
            <p className="text-agricultural-earth">System events will appear here</p>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <GlassCard key={event.id} className="p-6">
                <div className="flex gap-4">
                  <div className="text-3xl">{getEventIcon(event.eventType)}</div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className={`font-bold text-lg ${getEventColor(event.eventType)}`}>
                          {event.action}
                        </h3>
                        <p className="text-sm text-agricultural-earth">
                          by {event.actor}
                        </p>
                      </div>
                      <span className="text-xs text-agricultural-earth">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {event.metadata && (
                      <div className="mt-3 p-3 rounded-lg bg-white/30 border border-white/50">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
