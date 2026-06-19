'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearAuthState, getAuthState } from '@/lib/auth';

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
          <span className="brand-mark">⌘</span>
          <span className="brand-name">A-DAP-T</span>
        </Link>

        <nav className="nav-links" aria-label="Primary navigation">
          <Link className="nav-link" href="/scanner">Scanner</Link>
          <Link className="nav-link" href="/report/current">Report</Link>
          <Link className="nav-link" href="/profile">Profile</Link>
          <Link className="nav-link" href="/methodology">Methodology</Link>
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
