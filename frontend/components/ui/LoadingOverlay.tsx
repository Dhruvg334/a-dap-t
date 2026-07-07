'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  steps: string[];
  activeIndex: number;
}

export function LoadingOverlay({ isVisible, steps, activeIndex }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <motion.div 
            className="loading-card"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              background: 'var(--adapt-surface)',
              border: '1px solid var(--adapt-border)',
              padding: '48px',
              borderRadius: '24px',
              width: 'min(100%, 480px)',
              textAlign: 'center',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
            }}
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              style={{ marginBottom: '24px', display: 'inline-block', color: 'var(--adapt-accent)' }}
            >
              <Loader2 size={48} />
            </motion.div>
            
            <h2 style={{ 
              fontFamily: 'Space Grotesk, Inter, sans-serif', 
              fontSize: '24px', 
              margin: '0 0 8px 0',
              color: 'var(--adapt-text)'
            }}>
              Scanning Project
            </h2>
            <p style={{ color: 'var(--adapt-muted)', marginBottom: '32px', fontSize: '14px' }}>
              Performing static analysis. Project code is not executed.
            </p>
            
            <div style={{ display: 'grid', gap: '16px', textAlign: 'left' }}>
              {steps.map((step, index) => {
                const isActive = index === activeIndex;
                const isPast = index < activeIndex;
                return (
                  <motion.div 
                    key={step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: '24px 1fr',
                      gap: '12px',
                      alignItems: 'center',
                      opacity: isActive ? 1 : isPast ? 0.5 : 0.2,
                      color: isActive ? 'var(--adapt-accent)' : 'var(--adapt-text)'
                    }}
                  >
                    <div style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', 
                      border: '1px solid',
                      borderColor: isPast || isActive ? 'var(--adapt-accent)' : 'var(--adapt-border)',
                      background: isPast ? 'var(--adapt-accent)' : 'transparent',
                      color: isPast ? 'var(--adapt-bg)' : 'inherit',
                      display: 'grid', placeItems: 'center'
                    }}>
                      {isPast ? <ShieldCheck size={14} /> : <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }}>{index + 1}</span>}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: isActive ? 600 : 400 }}>{step}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
