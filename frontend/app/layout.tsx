import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'A-DAP-T | AI Agent Deployment Safety Gate',
  description: 'Scan, prove, patch, re-scan, and gate unsafe AI-agent deployments.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-bg-grid" />
        <div className="bg-orb one" />
        <div className="bg-orb two" />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
