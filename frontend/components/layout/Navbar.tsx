'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { clearAuthState, getAuthState } from '@/lib/auth';
import { BrandWord } from '@/components/ui/BrandWord';
import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

function ShieldMark() {
  const [imageFailed, setImageFailed] = useState(false);
  if (!imageFailed) return <img className="brand-logo-img" src="/adapt-logo.svg" alt="" onError={() => setImageFailed(true)} />;
  return <span className="brand-fallback">A</span>;
}

export function Navbar() {
  const pathname = usePathname();
  const [isAuthed, setIsAuthed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const checkAuth = () => setIsAuthed(!!getAuthState());
    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, [pathname]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('adapt-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme === 'light' || storedTheme === 'dark'
      ? storedTheme
      : systemPrefersDark
        ? 'dark'
        : 'light';

    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('adapt-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

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
          <button
            type="button"
            className="adapt-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-pressed={theme === 'light'}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span className={`adapt-theme-toggle-track ${theme === 'light' ? 'is-light' : ''}`}>
              <span className="adapt-theme-toggle-thumb">
                {theme === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
              </span>
            </span>
          </button>
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
      <style jsx>{`
        .adapt-theme-toggle {
          border: 1px solid rgba(124, 255, 0, 0.22);
          background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(124,255,0,0.12));
          color: var(--text);
          padding: 0;
          width: 46px;
          height: 28px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(21, 162, 79, 0.14);
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          backdrop-filter: blur(14px);
        }
        .adapt-theme-toggle:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(21, 162, 79, 0.2);
          border-color: rgba(124, 255, 0, 0.34);
        }
        .adapt-theme-toggle-track {
          width: 100%;
          height: 100%;
          border-radius: inherit;
          padding: 3px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          background: linear-gradient(90deg, rgba(4,8,6,0.92), rgba(21,162,79,0.24));
          transition: justify-content 0.3s ease, background 0.3s ease;
        }
        .adapt-theme-toggle-track.is-light {
          justify-content: flex-end;
          background: linear-gradient(90deg, rgba(21,162,79,0.24), rgba(255,255,255,0.9));
        }
        .adapt-theme-toggle-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: var(--text-dark);
          background: linear-gradient(135deg, #ffffff, rgba(124,255,0,0.9));
          box-shadow: 0 4px 10px rgba(0,0,0,0.18);
          transition: transform 0.3s ease, background 0.3s ease;
        }
        .adapt-theme-toggle:hover .adapt-theme-toggle-thumb {
          transform: scale(1.03);
        }
      `}</style>
    </motion.header>
  );
}
