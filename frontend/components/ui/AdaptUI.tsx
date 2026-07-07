'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

export type Tone = 'safe' | 'warning' | 'danger' | 'neutral' | 'accent';

export function AdaptBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`adapt-badge ${tone}`}>{children}</span>;
}

export function AdaptButton({ href, children, tone = 'secondary', onClick, disabled, type = 'button' }: { href?: string; children: ReactNode; tone?: 'primary' | 'secondary' | 'danger' | 'ghost'; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' }) {
  const className = `adapt-button ${tone}`;
  if (href) return <Link href={href} className={className}>{children}</Link>;
  return <button type={type} className={className} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function PageHeader({ label, title, children, actions }: { label: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <section className="adapt-page-header">
      <div>
        <div className="adapt-kicker"><span />{label}</div>
        <h1>{title}</h1>
        {children ? <p>{children}</p> : null}
      </div>
      {actions ? <div className="adapt-header-actions">{actions}</div> : null}
    </section>
  );
}

export function SectionTitle({ label, title, children, action }: { label: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="adapt-section-title">
      <div>
        <div className="adapt-kicker"><span />{label}</div>
        <h2>{title}</h2>
        {children ? <p>{children}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function StatTile({ label, value, tone = 'neutral', helper }: { label: string; value: ReactNode; tone?: Tone; helper?: ReactNode }) {
  return (
    <div className={`adapt-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="adapt-empty">
      <div className="adapt-kicker"><span />EMPTY STATE</div>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action ? <div className="adapt-empty-action">{action}</div> : null}
    </div>
  );
}

export function InlineProgress({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  return (
    <div className="adapt-progress" aria-label="Scan progress">
      {steps.map((step, index) => (
        <div key={step} className={`adapt-progress-step ${index <= activeIndex ? 'active' : ''}`}>
          <i />
          <span>{step}</span>
        </div>
      ))}
    </div>
  );
}
