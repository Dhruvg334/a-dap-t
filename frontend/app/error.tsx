'use client';
import { useEffect } from 'react';
import { AdaptButton } from '@/components/ui/AdaptUI';
import { AlertTriangle } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('ADAPT Error Boundary caught:', error);
  }, [error]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      backgroundColor: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: 'var(--adapt-surface, #ffffff)',
        border: '1px solid var(--adapt-border, #dcefe2)',
        borderRadius: '16px',
        maxWidth: '480px',
        width: '100%',
        padding: '32px',
        textAlign: 'center',
        boxShadow: '0 24px 48px rgba(22, 163, 74, 0.12)',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(255, 60, 60, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          color: 'var(--adapt-danger, #ff4444)'
        }}>
          <AlertTriangle size={32} />
        </div>
        <h2 style={{ margin: '0 0 12px', fontSize: '24px', fontFamily: 'Chivo, sans-serif' }}>System Error</h2>
        <p style={{ margin: '0 0 24px', color: 'var(--adapt-muted, #aaa)', lineHeight: 1.5 }}>
          An unexpected error occurred while processing your request. Please try again. If the issue persists after several attempts, try waiting a few moments.
        </p>
        <div style={{ padding: '12px', background: 'var(--adapt-border, #222)', borderRadius: '8px', textAlign: 'left', marginBottom: '24px', fontSize: '13px', color: 'var(--adapt-faint, #666)', overflowX: 'auto' }}>
          <code>{error.message || 'Unknown error'}</code>
        </div>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
          <AdaptButton tone="primary" onClick={() => reset()}>
            Retry Now
          </AdaptButton>
        </div>
      </div>
    </div>
  );
}
