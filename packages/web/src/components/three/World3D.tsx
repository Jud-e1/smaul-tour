'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { WorldVariant } from './World';

const World = dynamic(() => import('./World'), {
  ssr: false,
  loading: () => <div className="w-full h-full animate-pulse rounded-[40px] bg-sand/60" />,
});

/**
 * Client-only wrapper for the 3D world. Falls back to a still photograph when
 * WebGL is unavailable or the visitor prefers reduced motion.
 */
export default function World3D({
  variant = 'island',
  className = '',
  fallback = '/photos/capecoast.jpg',
}: {
  variant?: WorldVariant;
  className?: string;
  fallback?: string;
}) {
  const [mode, setMode] = useState<'pending' | '3d' | 'still'>('pending');

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let webgl = false;
    try {
      const c = document.createElement('canvas');
      webgl = !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      webgl = false;
    }
    setMode(webgl && !reduce ? '3d' : 'still');
  }, []);

  if (mode === 'pending') return <div className={className} />;
  if (mode === 'still') {
    return (
      <div className={`${className} overflow-hidden rounded-[40px]`}>
        <img src={fallback} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return <World variant={variant} className={className} />;
}
