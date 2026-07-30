import { Link } from 'react-router-dom'
import { COMPANY } from '../lib/company'

// Shared chrome for the legal pages. They sit outside the app shell — a
// visitor reading the privacy policy hasn't signed in and shouldn't meet a
// sidebar full of features they can't reach.
export default function LegalLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-3xl items-center px-6 py-4">
          <Link to="/" className="flex items-center gap-2" title="Back to home page">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              P
            </div>
            <span className="text-base font-semibold text-slate-900">{COMPANY.product}</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-600">{children}</div>

        <div className="mt-12 border-t border-slate-100 pt-6 text-xs text-slate-400">
          <p>
            {COMPANY.product} is operated by {COMPANY.legalName}, registered in {COMPANY.registeredIn} no.{' '}
            {COMPANY.registrationNumber}. VAT {COMPANY.vatNumber}.
          </p>
          {COMPANY.registeredOffice && <p className="mt-1">Registered office: {COMPANY.registeredOffice}</p>}
          <p className="mt-3">
            <Link to="/" className="text-indigo-600 hover:text-indigo-700">
              Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

// Deliberately loud. These pages are routable and public the moment they
// deploy, and a placeholder that looks like a finished policy is worse than
// no page at all — someone could reasonably believe they were covered.
export function NotPublishedYet({ children }) {
  return (
    <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/20">
      <p className="font-semibold">This document has not been published yet.</p>
      <p className="mt-1">{children}</p>
    </div>
  )
}
