'use client';

import { FormEvent, useState } from 'react';
import { BookOpen, LockKeyhole, ArrowRight } from 'lucide-react';

export default function AccessPage() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function unlock(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/access/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not unlock Margin.');
      window.location.replace('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not unlock Margin.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="access-page">
    <section className="access-card">
      <div className="access-mark"><BookOpen size={25}/></div>
      <div className="access-kicker"><LockKeyhole size={13}/> PRIVATE LIBRARY</div>
      <h1>Open Margin.</h1>
      <p>Enter the access code shown by the Margin runner on the host computer. This device will stay signed in for 30 days.</p>
      <form onSubmit={unlock}>
        <label>Access code
          <input value={code} onChange={(event)=>setCode(event.target.value.toUpperCase())} autoComplete="one-time-code" autoFocus placeholder="ABCD-EFGH-IJKL-MNOP"/>
        </label>
        {error&&<div className="access-error">{error}</div>}
        <button className="button primary" disabled={busy||!code.trim()}>{busy?'Unlocking…':<>Unlock library<ArrowRight size={16}/></>}</button>
      </form>
      <span className="access-foot">Your articles, model credentials, and database stay on the host computer.</span>
    </section>
  </main>;
}
