import { useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import FormField, { inputClass } from '../components/FormField'
import { COMPANY } from '../lib/company'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error || 'Could not send your message')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-geist text-zinc-900">
      <SiteHeader />

      <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">Get in touch</h1>
          <p className="mt-3 text-zinc-600">
            Questions about Provaserve, your account, or a contract you&apos;re already running &mdash; send us a
            message and we&apos;ll reply within one business day.
          </p>
        </div>

        <div className="mt-12 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          {submitted ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-sm text-zinc-600">
                Thanks{form.name ? `, ${form.name.split(' ')[0]}` : ''} &mdash; we&apos;ve got your message and will
                reply to {form.email || 'your email'} within one business day.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Full name">
                  <input className={inputClass} value={form.name} onChange={set('name')} required />
                </FormField>
                <FormField label="Work email">
                  <input type="email" className={inputClass} value={form.email} onChange={set('email')} required />
                </FormField>
              </div>

              <FormField label="Company">
                <input className={inputClass} value={form.company} onChange={set('company')} />
              </FormField>

              <FormField label="Message">
                <textarea
                  rows={5}
                  className={inputClass}
                  value={form.message}
                  onChange={set('message')}
                  required
                />
              </FormField>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-zinc-500">
          Prefer email? Reach us directly at{' '}
          <a href={`mailto:${COMPANY.contactEmail}`} className="font-medium text-zinc-900 hover:text-zinc-600">
            {COMPANY.contactEmail}
          </a>
          .
        </p>
      </div>

      <SiteFooter />
    </div>
  )
}
