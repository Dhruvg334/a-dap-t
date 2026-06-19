'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearAuthState, getAuthState } from '@/lib/auth';
import { BrandWord } from '@/components/ui/BrandWord';

function ShieldMark() {
  const [imageFailed, setImageFailed] = useState(false);

  if (!imageFailed) {
    return <img className="brand-logo-img" src="/adapt-logo.svg" alt="" onError={() => setImageFailed(true)} />;
  }

  return (
    <svg className="brand-shield" viewBox="0 0 24 26" fill="none" aria-hidden="true">
      <path d="M12 2.2 20.5 5.4v6.3c0 5.5-3.3 9.4-8.5 12.1-5.2-2.7-8.5-6.6-8.5-12.1V5.4L12 2.2Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.2 13.2h7.6M12 9.4v7.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}


export function Navbar() {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    setIsAuthed(!!getAuthState());
  }, []);

  function logout() {
    clearAuthState();
    setIsAuthed(false);
    window.location.href = '/';
  }

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link href="/" className="brand" aria-label="A-DAP-T home">
          <span className="brand-mark"><ShieldMark /></span>
          <span className="brand-name"><BrandWord /></span>
        </Link>

        <nav className="nav-links" aria-label="Primary navigation">
          <Link className="nav-link" href="/scanner">Scanner</Link>
          <Link className="nav-link" href="/report/current">Report</Link>
          <Link className="nav-link" href="/profile">Profile</Link>
          <Link className="nav-link" href="/methodology">Methodology</Link>
          <Link className="nav-link" href="/about">About</Link>
        </nav>

        <div className="nav-actions">
          {isAuthed ? (
            <>
              <Link className="btn btn-secondary btn-small" href="/profile">Profile</Link>
              <button className="btn btn-secondary btn-small" type="button" onClick={logout}>Log out</button>
            </>
          ) : (
            <>
              <Link className="btn btn-secondary btn-small" href="/signin">Log in</Link>
              <Link className="btn btn-primary btn-small" href="/signup">Get access</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
