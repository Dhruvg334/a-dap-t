'use client';

import { FormEvent, useRef, useState } from 'react';
import type { ScanReport } from '@/types/scan';
import { apiFetch, formatApiError } from '@/lib/api';

const AGENT_ID = 'Lze6qsMDkTny5QtOz5W69FR3OG4';

type Message = { role: 'user' | 'bot'; text: string };

const quickQuestions = [
  'What should I fix first?',
  'Can I deploy this?',
  'Prove the highest risk path.',
  'Which patch should I use?'
];

export function DapPanel({ report }: { report: ScanReport }) {
  const [question, setQuestion] = useState('');
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Ask DAP about this report. I can use findings, Prove Mode, patch previews, and the deployment gate.' }
  ]);
  const [loading, setLoading] = useState(false);
  const conversationId = useRef(crypto.randomUUID());

  async function ask(text: string, isSuggested = false) {
    const clean = text.trim();
    if (!clean || loading) return;
    setOpen(true);
    setMessages((prev) => [...prev, { role: 'user', text: clean }, { role: 'bot', text: 'Thinking through the report...' }]);
    setQuestion('');
    setLoading(true);

    window.pendo?.trackAgent("prompt", {
      agentId: AGENT_ID,
      conversationId: conversationId.current,
      messageId: crypto.randomUUID(),
      content: clean,
      suggestedPrompt: isSuggested,
    });

    try {
      const data = await apiFetch<{ answer?: string }>('/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: clean, scan_result: report }),
      });
      const responseText = data.answer || 'DAP could not produce an answer.';
      setMessages((prev) => [...prev.slice(0, -1), { role: 'bot', text: responseText }]);

      window.pendo?.trackAgent("agent_response", {
        agentId: AGENT_ID,
        conversationId: conversationId.current,
        messageId: crypto.randomUUID(),
        content: responseText,
      });
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
    <>
      {open && <button className="dap-backdrop" type="button" aria-label="Close DAP assistant" onClick={() => setOpen(false)} />}
      <button className="dap-floating-button" type="button" onClick={() => setOpen(true)} aria-label="Open DAP assistant">
        <span className="dap-bot-mark">DAP</span>
        <span className="dap-bot-copy">Ask report</span>
      </button>
      <aside className={`dap-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="glass-card panel dap-box">
          <div className="panel-head dap-drawer-head">
            <div>
              <div className="panel-label">DAP assistant</div>
              <h2 className="panel-title">Ask the report.</h2>
            </div>
            <button className="btn btn-secondary btn-small" type="button" onClick={() => setOpen(false)}>Close</button>
          </div>
          <div className="dap-quick-row">
            {quickQuestions.map((item) => (
              <button key={item} className="btn btn-secondary btn-small" type="button" onClick={() => ask(item, true)} disabled={loading}>{item}</button>
            ))}
          </div>
          <div className="dap-messages">
            {messages.map((message, index) => (
              <div className={`dap-msg ${message.role === 'user' ? 'user' : ''}`} key={`${message.role}-${index}`}>{message.text}</div>
            ))}
          </div>
          <form className="form-stack dap-form" onSubmit={onSubmit}>
            <input className="input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about this scan..." />
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Asking DAP...' : 'Ask DAP'}</button>
          </form>
        </div>
      </aside>
    </>
  );
}
