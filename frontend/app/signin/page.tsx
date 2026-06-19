'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { saveAuthState } from '@/lib/auth';

type LoginResponse = { idToken?: string; refreshToken?: string; expiresIn?: string; localId?: string; email?: string; displayName?: string };

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMessage(new URLSearchParams(window.location.search).get('message') || '');
  }, []);

  function getNextPath() {
    if (typeof window === 'undefined') return '/scanner';
    const next = new URLSearchParams(window.location.search).get('next');
    return next && next.startsWith('/') && !next.startsWith('//') ? next : '/scanner';
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        auth: false,
      });

      saveAuthState({
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
        uid: data.localId,
        email: data.email || email,
        displayName: data.displayName || 'A-DAP-T User',
      });

      router.push(getNextPath());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-wrap">
      <section className="glass-card auth-card shimmer">
        <div className="tech-label"><span className="pulse-dot" /> SECURE SESSION</div>
        <h1>Log in.</h1>
        <p className="muted">Access scanner, report history, DAP, and deployment gate outputs.</p>
        <form className="form-stack" onSubmit={submit} style={{ marginTop: 24 }}>
          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}
          <label className="form-row">
            <span className="form-label">Email</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="form-row">
            <span className="form-label">Password</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <p className="muted" style={{ marginTop: 18 }}>No account? <Link href="/signup" style={{ color: 'var(--text)' }}>Create one</Link></p>
      </section>
    </main>
  );
}
