'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { saveAuthState } from '@/lib/auth';

type LoginResponse = { idToken?: string; refreshToken?: string; expiresIn?: string; localId?: string; email?: string; displayName?: string };

export default function SignUpPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function getNextPath() {
    if (typeof window === 'undefined') return '/scanner';
    const next = new URLSearchParams(window.location.search).get('next');
    return next && next.startsWith('/') && !next.startsWith('//') ? next : '/scanner';
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, email, password }),
        auth: false,
      });

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
        displayName: data.displayName || displayName,
      });

      router.push(getNextPath());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-wrap">
      <section className="glass-card auth-card shimmer">
        <div className="tech-label"><span className="pulse-dot" /> CREATE ACCESS</div>
        <h1>Start scanning.</h1>
        <p className="muted">Create an account to save reports and run protected scan endpoints.</p>
        <form className="form-stack" onSubmit={submit} style={{ marginTop: 24 }}>
          {error && <div className="form-error">{error}</div>}
          <label className="form-row">
            <span className="form-label">Name</span>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </label>
          <label className="form-row">
            <span className="form-label">Email</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="form-row">
            <span className="form-label">Password</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label className="form-row">
            <span className="form-label">Confirm Password</span>
            <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
        </form>
        <p className="muted" style={{ marginTop: 18 }}>Already have an account? <Link href="/signin" style={{ color: 'var(--text)' }}>Sign in</Link></p>
      </section>
    </main>
  );
}
