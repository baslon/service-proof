import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'

// Shared chrome for the legal pages. They sit outside the app shell — a
// visitor reading the privacy policy hasn't signed in and shouldn't meet a
// sidebar full of features they can't reach — but they keep the same public
// header and footer as the rest of the site.
export default function LegalLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-zinc-50 font-geist text-zinc-900">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-600">{children}</div>
      </main>

      <SiteFooter />
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
