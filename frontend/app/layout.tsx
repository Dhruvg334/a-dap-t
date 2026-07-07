import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PendoInitializer } from '@/components/pendo/PendoInitializer';

export const metadata: Metadata = {
  title: 'A-DAP-T | AI Application Security Review',
  description: 'Review AI applications before production across code, dependencies, APIs, capabilities, guardrails, policy, and remedies.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var stored=window.localStorage.getItem('adapt-theme');var systemPrefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=stored==='light'||stored==='dark'?stored:systemPrefersDark?'dark':'light';document.documentElement.dataset.theme=theme;}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(apiKey){(function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];v=['initialize','identify','updateOptions','pageLoad','track','trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');})('234c48a7-f783-4bd0-868e-c2b4174d8adb');`,
          }}
        />
        <PendoInitializer />
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
