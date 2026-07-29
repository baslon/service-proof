import { useState } from 'react'
import { Link } from 'react-router-dom'
import BookPilotModal from '../components/modals/BookPilotModal'

const PROBLEMS = [
  {
    title: 'No proof a clean happened',
    body: "Clients ask for evidence after a complaint, and all you've got is a rota and a shrug.",
  },
  {
    title: 'Missed shifts go unnoticed',
    body: 'Without a paper trail, a skipped washroom clean is invisible until someone complains.',
  },
  {
    title: 'Disputes eat account manager time',
    body: 'Every "did this get done?" query means digging through texts, emails, and memory.',
  },
]

const STEPS = [
  {
    step: '1',
    title: 'Schedule the job',
    body: 'Set the task, site, recurrence, and required photo count in seconds.',
  },
  {
    step: '2',
    title: 'Operative submits proof',
    body: 'From their phone: photos, completion status, and notes, tied to the job automatically.',
  },
  {
    step: '3',
    title: 'Manager sees evidence live',
    body: 'Dashboard flags missing evidence and at-risk jobs before the client has to ask.',
  },
  {
    step: '4',
    title: 'Client gets the report',
    body: 'A clean, exportable proof-of-service report for every contract period.',
  },
]

const PERSONAS = [
  { role: 'Facilities Manager', need: 'Wants a single dashboard to see every site’s status without chasing supervisors.' },
  { role: 'Cleaning Company Owner', need: 'Needs hard evidence to defend contract renewals and justify pricing.' },
  { role: 'Operative / Cleaner', need: 'Wants a fast, simple way to prove the job is done without extra admin.' },
  { role: 'Client Contact', need: 'Wants confidence the contract is being delivered without micromanaging it.' },
]

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [bookingPilot, setBookingPilot] = useState(false)

  return (
    <div className="bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">P</div>
            <span className="text-base font-semibold text-slate-900">Provaserve</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              View dashboard
            </Link>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 sm:hidden"
            >
              {menuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-slate-100 px-6 py-4 sm:hidden">
            <a
              href="#how-it-works"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              How it works
            </a>
            <a
              href="#pricing"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Pricing
            </a>
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Sign in
            </Link>
          </nav>
        )}
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-28 text-center">
          <p className="mb-4 text-xs font-medium text-indigo-100">
            Proof-of-service for commercial cleaning
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-snug tracking-tight text-white sm:text-5xl sm:leading-snug">
            Stop guessing whether the clean actually happened.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-indigo-100">
            Provaserve turns every cleaning job into evidence: timestamped photos, completion status, and a
            report your client can trust &mdash; without a single extra spreadsheet.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              to="/dashboard"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
            >
              See it in action
            </Link>
            <button
              onClick={() => setBookingPilot(true)}
              className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Book a pilot
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">The evidence gap is costing you contracts</h2>
          <p className="mt-4 text-slate-500">
            SME facilities and cleaning companies lose renewals and goodwill over disputes that a simple photo would settle.
          </p>
        </div>
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900">{p.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">How it works</h2>
            <p className="mt-4 text-slate-500">From scheduled job to client-ready report, in four steps.</p>
          </div>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.step} className="relative rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {s.step}
                </div>
                <h3 className="text-base font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Built for everyone on the contract</h2>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PERSONAS.map((p) => (
            <div key={p.role} className="rounded-xl border border-slate-200 p-6">
              <h3 className="text-base font-semibold text-slate-900">{p.role}</h3>
              <p className="mt-2 text-sm text-slate-500">{p.need}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="bg-slate-900 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">Run a 4-week pilot on us</h2>
          <p className="mt-4 text-slate-300">
            Pick two sites. We'll get your operatives submitting evidence within a day, and your first client
            report out within a week. No contract required to trial it.
          </p>
          <div className="mt-6 flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold text-white">&pound;0</span>
            <span className="text-slate-400">for the pilot, then from &pound;49/site/month</span>
          </div>
          <div className="mt-8">
            <button
              onClick={() => setBookingPilot(true)}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-500"
            >
              Start the pilot
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-slate-400">
          &copy; 2026 Provaserve. Demo prototype &mdash; not a real product.
        </div>
      </footer>

      {bookingPilot && <BookPilotModal onClose={() => setBookingPilot(false)} />}
    </div>
  )
}
