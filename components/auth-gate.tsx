'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setError(error.message)
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession)
        setLoading(false)
      }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setError('Accesso non riuscito. Verifica email e password.')
    setBusy(false)
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-foreground">Verifica accesso…</div>
  if (session) return <>{children}</>

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <form onSubmit={signIn} className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-7 shadow-xl">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Viaggi</p>
          <h1 className="mt-2 text-2xl font-black">Accesso personale</h1>
          <p className="mt-2 text-sm text-muted-foreground">Accedi con il tuo account per consultare i viaggi. La sessione resterà memorizzata sul dispositivo.</p>
        </div>
        <label className="block space-y-1 text-sm font-medium">Email
          <input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <label className="block space-y-1 text-sm font-medium">Password
          <input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60">{busy ? 'Accesso…' : 'Accedi'}</button>
      </form>
    </main>
  )
}
