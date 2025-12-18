'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_ENDPOINTS } from '@/lib/api-config';

interface AuditEvent {
  id: string;
  eventType: string;
  warehouseName: string;
  userName: string;
  metadata: any;
  createdAt: string;
}

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
    fetchAuditLog();
  }, []);

  const fetchAuditLog = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(API_ENDPOINTS.ADMIN_AUDIT, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setEvents(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch audit log:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'GENESIS_INVENTORY_RECORDED':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'STOCK_INBOUND_RECORDED':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        );
      case 'OUTBOUND_REQUESTED':
      case 'OUTBOUND_APPROVED':
      case 'DISPATCH_EXECUTED':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes('GENESIS')) return '#8fcd84';
    if (eventType.includes('INBOUND')) return '#7ab86f';
    if (eventType.includes('APPROVED')) return '#a7d9a0';
    if (eventType.includes('REJECTED')) return '#b85c5c';
    if (eventType.includes('EXECUTED')) return '#d4a574';
    return '#6b6f69';
  };

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
            <h1 className="text-lg font-medium" style={{ color: '#1e1e1e' }}>Audit Trail</h1>
            <p className="text-xs" style={{ color: '#6b6f69' }}>Complete system activity log</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" 
                 style={{ borderColor: '#d9d9d5', borderTopColor: '#8fcd84' }} />
            <p style={{ color: '#6b6f69' }}>Loading audit log...</p>
          </div>
        ) : events.length === 0 ? (
          <div 
            className="rounded-2xl p-12 text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(138, 156, 123, 0.2)'
            }}
          >
            <svg className="w-16 h-16 mx-auto mb-4 opacity-40" style={{ color: '#6b6f69' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium mb-2" style={{ color: '#1e1e1e' }}>No events yet</p>
            <p style={{ color: '#6b6f69' }}>System events will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-xl p-5 transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(138, 156, 123, 0.2)'
                }}
              >
                <div className="flex gap-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${getEventColor(event.eventType)}20`, color: getEventColor(event.eventType) }}
                  >
                    {getEventIcon(event.eventType)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium" style={{ color: '#1e1e1e' }}>
                          {event.eventType.replace(/_/g, ' ')}
                        </h3>
                        <p className="text-sm" style={{ color: '#6b6f69' }}>
                          {event.warehouseName} • {event.userName}
                        </p>
                      </div>
                      <span className="text-xs" style={{ color: '#6b6f69' }}>
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div 
                        className="mt-3 p-3 rounded-lg text-xs font-mono"
                        style={{ background: 'rgba(138, 156, 123, 0.1)', color: '#3a3f38' }}
                      >
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
