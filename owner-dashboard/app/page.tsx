'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('ownerToken');
    
    if (token) {
      // Redirect to dashboard if logged in
      router.push('/dashboard');
    } else {
      // Redirect to login if not logged in
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-zinc-300 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-600">Loading...</p>
      </div>
    </div>
  );
}
