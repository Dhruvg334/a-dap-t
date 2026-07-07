'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { clearAuthState, getAuthState } from '@/lib/auth';
import { BrandWord } from '@/components/ui/BrandWord';
import { motion } from 'framer-motion';

function ShieldMark() {
  const [imageFailed, setImageFailed] = useState(false);
  if (!imageFailed) return <img className="brand-logo-img" src="/adapt-logo.svg" alt="" onError={() => setImageFailed(true)} />;
  return <span className="brand-fallback">A</span>;
}

export function Navbar() {
  const pathname = usePathname();
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const checkAuth = () => setIsAuthed(!!getAuthState());
    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, [pathname]);

  function logout() {
    clearAuthState();
    if (typeof pendo !== 'undefined') pendo.clearSession();
    setIsAuthed(false);
    window.location.href = '/';
  }

  const navLinks = [
    { name: 'Overview', href: '/' },
    { name: 'Scanner', href: '/scanner' },
    { name: 'Report', href: '/report/current' },
    { name: 'Compare', href: '/compare' },
    { name: 'Methodology', href: '/methodology' },
    { name: 'About', href: '/about' },
  ];

  return (
    <motion.header 
      className="adapt-nav-shell"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="adapt-floating-nav">
        <Link href="/" className="adapt-brand" aria-label="A-DAP-T home">
          <span className="adapt-brand-mark"><ShieldMark /></span>
          <span><BrandWord /> <em></em></span>
        </Link>

        <nav className="adapt-nav-links" aria-label="Primary navigation">
          {navLinks.map((link, index) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href.replace('/current', ''));
            return (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
              >
                <Link className={`adapt-nav-link ${isActive ? 'active' : ''}`} href={link.href}>{link.name}</Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="adapt-nav-actions">
          {isAuthed ? (
            <>
              <Link className="adapt-nav-cta" href="/profile">Profile</Link>
              <button className="adapt-nav-text" type="button" onClick={logout}>Log out</button>
            </>
          ) : (
            <Link className="adapt-nav-cta" href="/signin">Sign in</Link>
          )}
        </div>
      </div>
    </motion.header>
  );
}
