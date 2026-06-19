'use client';

import { FormEvent, useState } from 'react';
import type { ScanReport } from '@/types/scan';
import { apiFetch, formatApiError } from '@/lib/api';

type Message = { role: 'user' | 'bot'; text: string };

const quickQuestions = [
  'What should I fix first?',
  'Can I deploy this?',
  'Prove the highest risk path.',
  'Which patch should I use?'
];

export function DapPanel({ report }: { report: ScanReport }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Ask DAP about this report. I can use findings, Prove Mode, patch previews, and the deployment gate.' }
  ]);
  const [loading, setLoading] = useState(false);

  async function ask(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;
    setMessages((prev) => [...prev, { role: 'user', text: clean }, { role: 'bot', text: 'Thinking through the report...' }]);
    setQuestion('');
    setLoading(true);

    try {
      const data = await apiFetch<{ answer?: string }>('/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: clean, scan_result: report }),
      });
      setMessages((prev) => [...prev.slice(0, -1), { role: 'bot', text: data.answer || 'DAP could not produce an answer.' }]);
    } catch (error) {
      setMessages((prev) => [...prev.slice(0, -1), { role: 'bot', text: formatApiError(error, 'DAP is unavailable right now.') }]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  return (
    <aside className="glass-card panel dap-box">
      <div className="panel-head">
        <div>
          <div className="panel-label">DAP assistant</div>
          <h2 className="panel-title">Ask the report.</h2>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {quickQuestions.map((item) => (
          <button key={item} className="btn btn-secondary btn-small" type="button" onClick={() => ask(item)} disabled={loading}>{item}</button>
        ))}
      </div>
      <div className="dap-messages">
        {messages.map((message, index) => (
          <div className={`dap-msg ${message.role === 'user' ? 'user' : ''}`} key={`${message.role}-${index}`}>{message.text}</div>
        ))}
      </div>
      <form className="form-stack" style={{ marginTop: 14 }} onSubmit={onSubmit}>
        <input className="input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about this scan..." />
        <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Asking DAP...' : 'Ask DAP'}</button>
      </form>
    </aside>
  );
}
